class OllamaChat {
    constructor() {
        this.currentModel = null;
        this.messages = [];
        this.models = [];
        this.selectedImage = null;  // 선택된 이미지 저장
        this.currentUser = null;
        this.conversations = [];  // 대화 목록
        this.currentConversation = null;  // 현재 대화
        this.setupMarked();
        this.init();
    }

    // Marked 설정
    setupMarked() {
        marked.setOptions({
            breaks: true,
            gfm: true,
            headerIds: false,
            mangle: false
        });

        // 코드 블록에 하이라이팅 적용
        const renderer = new marked.Renderer();
        const originalCode = renderer.code.bind(renderer);
        renderer.code = function(code, language) {
            if (language && hljs.getLanguage(language)) {
                return `<pre><code class="hljs language-${language}">${hljs.highlight(code, { language }).value}</code></pre>`;
            } else {
                return `<pre><code class="hljs">${hljs.highlightAuto(code).value}</code></pre>`;
            }
        };
        marked.setOptions({ renderer });
    }

    // 마크다운을 HTML로 변환
    renderMarkdown(text) {
        try {
            const html = marked.parse(text);
            // XSS 공격 방지
            return DOMPurify.sanitize(html);
        } catch (error) {
            console.error('Markdown render error:', error);
            return text;
        }
    }

    // 바이트를 읽기 좋은 형식으로 변환
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
    }

    async init() {
        // 로그인 상태 확인 (사용자 정보 로드)
        await this.checkAuth();

        this.setupEventListeners();
        await this.checkConnection();
        await this.loadModels();
        await this.loadConversations();  // 대화 목록 불러오기
    }

    setupEventListeners() {
        // 로그아웃
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());

        // 새 대화
        document.getElementById('new-conversation-btn').addEventListener('click', () => this.createConversation());

        // 채팅
        document.getElementById('send-btn').addEventListener('click', () => this.sendMessage());
        document.getElementById('message-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        document.getElementById('model-select').addEventListener('change', (e) => {
            this.currentModel = e.target.value;
            this.messages = [];
            this.updateChatDisplay();

            // 선택한 모델 저장
            if (this.currentModel) {
                this.saveLastModel(this.currentModel);
            }
        });

        // 모달
        document.getElementById('models-btn').addEventListener('click', () => this.openModal());
        document.getElementById('close-modal-btn').addEventListener('click', () => this.closeModal());
        document.getElementById('modal-overlay').addEventListener('click', () => this.closeModal());

        // 모달 드래그
        const modalHeader = document.getElementById('modal-header');
        if (modalHeader) {
            modalHeader.addEventListener('mousedown', (e) => this.startDragModal(e));
        }

        // 모달 크기 조절 (없으면 스킵)
        const resizeHandle = document.getElementById('resize-handle');
        if (resizeHandle) {
            resizeHandle.addEventListener('mousedown', (e) => this.startResizeModal(e));
        }

        // 모델 다운로드
        document.getElementById('pull-btn').addEventListener('click', () => this.pullModel());

        // 이미지 업로드
        document.getElementById('image-upload-btn').addEventListener('click', () => {
            document.getElementById('image-input').click();
        });

        document.getElementById('image-input').addEventListener('change', (e) => {
            this.handleImageUpload(e);
        });

        document.getElementById('remove-image-btn').addEventListener('click', () => {
            this.removeImage();
        });

        // 드래그 드롭
        const messageInput = document.getElementById('message-input');
        messageInput.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            messageInput.classList.add('drag-over');
        });

        messageInput.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            messageInput.classList.remove('drag-over');
        });

        messageInput.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            messageInput.classList.remove('drag-over');
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type.startsWith('image/')) {
                this.loadImage(files[0]);
            }
        });

        // 클립보드 붙여넣기
        messageInput.addEventListener('paste', (e) => {
            const items = e.clipboardData?.items;
            if (items) {
                for (let i = 0; i < items.length; i++) {
                    if (items[i].type.startsWith('image/')) {
                        e.preventDefault();
                        const file = items[i].getAsFile();
                        this.loadImage(file);
                        break;
                    }
                }
            }
        });
    }

    startDragModal(e) {
        const modal = document.getElementById('models-modal');
        const modalContent = modal.querySelector('.modal-content');
        let isResizing = false;

        // resize handle인지 확인
        if (e.target.id === 'resize-handle') {
            return;
        }

        const rect = modal.getBoundingClientRect();
        const startX = e.clientX;
        const startY = e.clientY;
        const startLeft = rect.left;
        const startTop = rect.top;

        const handleMouseMove = (moveEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;

            modal.style.left = (startLeft + deltaX) + 'px';
            modal.style.top = (startTop + deltaY) + 'px';
            modal.style.transform = 'none';
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }

    startResizeModal(e) {
        const modal = document.getElementById('models-modal');
        const rect = modal.getBoundingClientRect();
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = rect.width;
        const startHeight = rect.height;

        const handleMouseMove = (moveEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;

            const newWidth = Math.max(400, startWidth + deltaX);
            const newHeight = Math.max(300, startHeight + deltaY);

            modal.style.width = newWidth + 'px';
            modal.style.height = newHeight + 'px';
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }

    openModal() {
        document.getElementById('models-modal').classList.remove('hidden');
        document.getElementById('modal-overlay').classList.remove('hidden');
        // 모달 내용 로드
        this.loadModels();
    }

    closeModal() {
        document.getElementById('models-modal').classList.add('hidden');
        document.getElementById('modal-overlay').classList.add('hidden');
    }

    handleImageUpload(e) {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            this.loadImage(file);
        }
    }

    loadImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            this.selectedImage = e.target.result;
            this.showImagePreview();
        };
        reader.readAsDataURL(file);
    }

    showImagePreview() {
        const container = document.getElementById('image-preview-container');
        const preview = document.getElementById('image-preview');
        preview.src = this.selectedImage;
        container.style.display = 'flex';
    }

    removeImage() {
        this.selectedImage = null;
        document.getElementById('image-preview-container').style.display = 'none';
        document.getElementById('image-input').value = '';
    }

    async checkAuth() {
        // 로그인 상태 확인
        try {
            const response = await fetch('/api/auth/check');
            const data = await response.json();

            if (data.authenticated) {
                this.currentUser = data.user;
                this.updateUserDisplay();
                return true;
            } else {
                return false;
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            return false;
        }
    }

    updateUserDisplay() {
        // 사용자 정보 표시
        const usernameDisplay = document.getElementById('username-display');
        const adminLink = document.getElementById('admin-link');
        if (this.currentUser && usernameDisplay) {
            usernameDisplay.textContent = this.currentUser.username;

            // Admin 링크 표시
            if (this.currentUser.is_admin && adminLink) {
                adminLink.classList.remove('hidden');
            } else if (adminLink) {
                adminLink.classList.add('hidden');
            }
        }
    }

    // ============ 대화 이력 관련 메서드 ============

    async loadConversations() {
        // 대화 목록 불러오기
        try {
            const response = await fetch('/api/conversations');
            const data = await response.json();

            if (data.success) {
                this.conversations = data.conversations;
                this.renderConversationsList();
            }
        } catch (error) {
            console.error('Failed to load conversations:', error);
        }
    }

    renderConversationsList() {
        // 대화 목록 UI 렌더링
        const listContainer = document.getElementById('conversations-list');

        if (this.conversations.length === 0) {
            listContainer.innerHTML = '<div class="p-4 text-slate-400 text-sm text-center">대화가 없습니다</div>';
            return;
        }

        // 날짜별로 그룹화
        const grouped = {};
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        this.conversations.forEach(conv => {
            const date = new Date(conv.created_at);
            let group = '이전';

            if (date.toDateString() === today.toDateString()) {
                group = '오늘';
            } else if (date.toDateString() === yesterday.toDateString()) {
                group = '어제';
            }

            if (!grouped[group]) grouped[group] = [];
            grouped[group].push(conv);
        });

        let html = '';
        ['오늘', '어제', '이전'].forEach(group => {
            if (grouped[group]) {
                html += `<div class="px-4 py-2 text-xs font-semibold text-slate-400 sticky top-0 bg-slate-900">${group}</div>`;
                grouped[group].forEach(conv => {
                    const isSelected = this.currentConversation?.id === conv.id;
                    html += `
                        <div class="group px-3 py-2 mx-2 rounded-lg transition flex items-center justify-between ${
                            isSelected ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-300'
                        }">
                            <div class="flex-1 cursor-pointer min-w-0" onclick="chat.selectConversation(${conv.id})" title="${conv.title}">
                                <div class="truncate text-sm font-medium">${conv.title}</div>
                                <div class="text-xs ${isSelected ? 'text-blue-100' : 'text-slate-500'}">${conv.model_used || '모델 미정'}</div>
                            </div>
                            <button onclick="event.stopPropagation(); chat.deleteConversation(${conv.id})"
                                    class="ml-2 p-1 rounded opacity-0 group-hover:opacity-100 transition ${
                                        isSelected ? 'hover:bg-blue-700 text-blue-100' : 'hover:bg-slate-700 text-slate-400'
                                    }" title="삭제">
                                🗑️
                            </button>
                        </div>
                    `;
                });
            }
        });

        listContainer.innerHTML = html;
    }

    async createConversation() {
        // 새 대화 생성
        try {
            const response = await fetch('/api/conversations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: '새로운 대화'
                })
            });

            const data = await response.json();
            if (data.success) {
                this.conversations.unshift(data.conversation);
                this.selectConversation(data.conversation.id);
                this.renderConversationsList();
            }
        } catch (error) {
            console.error('Failed to create conversation:', error);
        }
    }

    async selectConversation(conversationId) {
        // 대화 선택 및 로드
        try {
            const response = await fetch(`/api/conversations/${conversationId}`);
            const data = await response.json();

            if (data.success) {
                this.currentConversation = data.conversation;
                this.messages = data.conversation.messages || [];
                this.currentModel = data.conversation.model_used || '';

                // 모델 선택 업데이트
                document.getElementById('model-select').value = this.currentModel;

                this.updateChatDisplay();
                this.renderConversationsList();
            }
        } catch (error) {
            console.error('Failed to load conversation:', error);
        }
    }

    async deleteConversation(conversationId) {
        // 대화 삭제
        if (!confirm('이 대화를 삭제하시겠습니까?')) return;

        try {
            const response = await fetch(`/api/conversations/${conversationId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            if (data.success) {
                this.conversations = this.conversations.filter(c => c.id !== conversationId);
                if (this.currentConversation?.id === conversationId) {
                    this.currentConversation = null;
                    this.messages = [];
                    this.updateChatDisplay();
                }
                this.renderConversationsList();
            }
        } catch (error) {
            console.error('Failed to delete conversation:', error);
        }
    }

    async logout() {
        // 로그아웃
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                window.location.href = '/login';
            } else {
                alert('로그아웃 중 오류가 발생했습니다');
            }
        } catch (error) {
            console.error('Logout error:', error);
            alert('로그아웃 중 오류가 발생했습니다');
        }
    }

    async checkConnection() {
        try {
            const response = await fetch('/api/health');

            if (!response.ok) {
                console.error('Health check failed:', response.status);
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            const statusEl = document.getElementById('status');
            const statusText = document.getElementById('status-text');

            if (data.connected) {
                statusEl.classList.remove('disconnected');
                statusEl.classList.add('connected');
                statusText.textContent = '✓ Ollama 연결됨';
            } else {
                statusEl.classList.remove('connected');
                statusEl.classList.add('disconnected');
                statusText.textContent = '✗ ' + data.message;
            }
        } catch (error) {
            const statusEl = document.getElementById('status');
            const statusText = document.getElementById('status-text');
            statusEl.classList.remove('connected');
            statusEl.classList.add('disconnected');
            statusText.textContent = '✗ 서버 연결 실패';
            console.error('Connection check failed:', error);
        }
    }

    async loadModels() {
        try {
            const response = await fetch('/api/models');

            if (!response.ok) {
                console.error('Models fetch failed:', response.status);
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                this.models = data.models || [];
                this.updateModelDisplay();

                // 마지막 사용한 모델 자동 선택
                this.restoreLastModel();
            } else {
                console.error('Failed to load models:', data.message);
            }
        } catch (error) {
            console.error('Error loading models:', error);
        }
    }

    // 마지막 사용한 모델 저장
    saveLastModel(modelName) {
        localStorage.setItem('lastModel', modelName);
    }

    // 마지막 사용한 모델 복원
    restoreLastModel() {
        const lastModel = localStorage.getItem('lastModel');
        if (lastModel) {
            const select = document.getElementById('model-select');
            // 저장된 모델이 존재하는지 확인
            if (Array.from(select.options).some(opt => opt.value === lastModel)) {
                select.value = lastModel;
                this.currentModel = lastModel;
                this.messages = [];
                this.updateChatDisplay();
            }
        }
    }

    updateModelDisplay() {
        const listContainer = document.getElementById('models-list');
        const select = document.getElementById('model-select');

        // Clear and rebuild
        listContainer.innerHTML = '';
        select.innerHTML = '<option value="">모델을 선택해주세요</option>';

        if (this.models.length === 0) {
            listContainer.innerHTML = '<p class="text-center text-slate-400 py-4">설치된 모델이 없습니다</p>';
            return;
        }

        this.models.forEach(model => {
            // Add to modal list
            const modelEl = document.createElement('div');
            modelEl.className = 'flex justify-between items-center p-4 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition cursor-default';

            const infoEl = document.createElement('div');
            infoEl.className = 'flex-1 min-w-0';

            const nameEl = document.createElement('div');
            nameEl.className = 'text-sm font-semibold text-white break-words';
            nameEl.textContent = model.name;

            const sizeEl = document.createElement('div');
            sizeEl.className = 'text-xs text-slate-400 font-medium mt-1';
            const sizeText = model.size ? this.formatBytes(model.size) : '크기 불명';
            sizeEl.textContent = sizeText;

            infoEl.appendChild(nameEl);
            infoEl.appendChild(sizeEl);

            const actionsEl = document.createElement('div');
            actionsEl.className = 'flex-shrink-0 ml-4';

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 rounded-lg hover:from-red-700 hover:to-red-800 transition duration-200 transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg';
            deleteBtn.textContent = '🗑️ 삭제';
            deleteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.deleteModel(model.name);
            });

            actionsEl.appendChild(deleteBtn);
            modelEl.appendChild(infoEl);
            modelEl.appendChild(actionsEl);
            listContainer.appendChild(modelEl);

            // Add to select
            const option = document.createElement('option');
            option.value = model.name;
            option.textContent = model.name;
            select.appendChild(option);
        });
    }

    async sendMessage() {
        const input = document.getElementById('message-input');
        const message = input.value.trim();

        if (!message && !this.selectedImage) return;
        if (!this.currentModel) {
            alert('모델을 선택해주세요');
            return;
        }

        // 대화가 없으면 새로 생성
        if (!this.currentConversation) {
            await this.createConversation();
            return; // 대화 생성 후 다시 sendMessage 호출
        }

        // 사용자 메시지 객체 생성
        const userMessage = {
            role: 'user',
            content: message || '(이미지만 첨부됨)'
        };

        // 이미지가 있으면 추가
        if (this.selectedImage) {
            userMessage.images = [this.selectedImage.split(',')[1]]; // base64만 추출
        }

        // Add user message to chat
        this.messages.push(userMessage);

        input.value = '';
        this.removeImage();
        this.updateChatDisplay();

        // Send to server
        try {
            const sendBtn = document.getElementById('send-btn');
            sendBtn.disabled = true;
            sendBtn.textContent = '응답 중...';

            // API 전송용 메시지 포맷 (이미지는 content에 포함)
            const messagesForAPI = this.messages.map(msg => {
                if (msg.images) {
                    return {
                        role: msg.role,
                        content: msg.content,
                        images: msg.images
                    };
                }
                return {
                    role: msg.role,
                    content: msg.content
                };
            });

            // 저장할 사용자 메시지 (이미지는 base64로 저장)
            const userMessageToSave = {
                content: message || '(이미지만 첨부됨)',
                image: this.selectedImage ? this.selectedImage.split(',')[1] : null
            };

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.currentModel,
                    messages: messagesForAPI,
                    conversation_id: this.currentConversation.id,
                    user_message: userMessageToSave
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // 스트리밍 응답 처리
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullContent = '';
            let assistantMessage = {
                role: 'assistant',
                content: '',
                metrics: null
            };

            // 어시스턴트 메시지를 미리 추가
            this.messages.push(assistantMessage);

            let finalData = null;
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const data = JSON.parse(line);

                            // 최종 응답 신호 확인
                            if (data.done && data.full_content) {
                                finalData = data;
                                assistantMessage.content = data.full_content;
                                assistantMessage.metrics = data.metrics;
                                assistantMessage.model = data.model;
                                continue;
                            }

                            if (data.success && data.chunk) {
                                fullContent += data.chunk;
                                // 실시간으로 메시지 업데이트
                                assistantMessage.content = fullContent;
                                this.updateChatDisplay();
                            }
                            // 메트릭 정보 저장 (done이 true일 때)
                            if (data.metrics && !data.full_content) {
                                assistantMessage.metrics = data.metrics;
                            }
                        } catch (e) {
                            // JSON 파싱 에러는 무시
                        }
                    }
                }
            }

            // 최종 업데이트
            this.updateChatDisplay();

            // AI 응답을 서버에 저장
            if (finalData && this.currentConversation) {
                try {
                    await fetch('/api/save-message', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            conversation_id: this.currentConversation.id,
                            content: finalData.full_content,
                            metrics: finalData.metrics,
                            model: this.currentModel
                        })
                    });
                } catch (error) {
                    console.error('Failed to save message:', error);
                }
            }
        } catch (error) {
            console.error('Error sending message:', error);
            this.messages.push({
                role: 'assistant',
                content: '메시지 전송 실패: ' + error.message
            });
            this.updateChatDisplay();
        } finally {
            const sendBtn = document.getElementById('send-btn');
            sendBtn.disabled = false;
            sendBtn.textContent = '전송';
        }
    }

    updateChatDisplay() {
        const container = document.getElementById('chat-container');

        if (this.messages.length === 0) {
            container.innerHTML = '<div class="flex items-center justify-center h-full text-slate-500"><p class="text-center">모델을 선택하고 메시지를 입력해주세요</p></div>';
            return;
        }

        container.innerHTML = '';
        this.messages.forEach(msg => {
            const messageEl = document.createElement('div');
            const isUser = msg.role === 'user';
            messageEl.className = `flex flex-col ${isUser ? 'items-end' : 'items-start'} mb-4`;

            const contentEl = document.createElement('div');
            contentEl.className = `max-w-2xl px-4 py-3 rounded-lg ${
                isUser
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-slate-800 border border-slate-700 text-slate-100 rounded-bl-none'
            }`;

            // AI 응답은 마크다운으로 렌더링, 사용자 입력은 그대로 표시
            if (msg.role === 'assistant') {
                contentEl.innerHTML = this.renderMarkdown(msg.content);
            } else {
                contentEl.textContent = msg.content;
            }

            messageEl.appendChild(contentEl);

            // 이미지가 있으면 표시 (사용자 메시지만)
            if (msg.images && msg.role === 'user') {
                const imageEl = document.createElement('div');
                imageEl.className = 'mt-2';
                const img = document.createElement('img');
                img.className = 'max-w-xs max-h-80 rounded-lg border border-blue-500';
                img.src = 'data:image/jpeg;base64,' + msg.images[0];
                imageEl.appendChild(img);
                messageEl.appendChild(imageEl);
            }

            container.appendChild(messageEl);

            // 메트릭 정보 표시 (AI 응답만)
            if (msg.role === 'assistant' && (msg.metrics || msg.model)) {
                const metricsEl = document.createElement('div');
                metricsEl.className = 'flex justify-start mb-4 ml-0';

                const metricContent = document.createElement('div');
                metricContent.className = 'max-w-2xl px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-slate-300 text-sm';

                let metricsHTML = '<div class="space-y-1">';

                // 모델 정보
                if (msg.model) {
                    metricsHTML += `<div><span class="font-semibold">🤖 모델:</span> ${msg.model}</div>`;
                }

                if (msg.metrics) {
                    if (msg.metrics.tokens_per_second) {
                        metricsHTML += `<div><span class="font-semibold">⚡ 토큰 속도:</span> ${msg.metrics.tokens_per_second} tokens/sec</div>`;
                    }
                    if (msg.metrics.generation_time_sec) {
                        metricsHTML += `<div><span class="font-semibold">⏱️ 생성 시간:</span> ${msg.metrics.generation_time_sec}s</div>`;
                    }
                    if (msg.metrics.prompt_processing_time_sec) {
                        metricsHTML += `<div><span class="font-semibold">📥 프롬프트 처리:</span> ${msg.metrics.prompt_processing_time_sec}s</div>`;
                    }
                    if (msg.metrics.load_time_sec) {
                        metricsHTML += `<div><span class="font-semibold">📦 모델 로드:</span> ${msg.metrics.load_time_sec}s</div>`;
                    }
                }

                metricsHTML += '</div>';

                metricContent.innerHTML = metricsHTML;
                metricsEl.appendChild(metricContent);
                container.appendChild(metricsEl);
            }
        });

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    async pullModel() {
        const input = document.getElementById('model-name-input');
        const modelName = input.value.trim();
        const statusEl = document.getElementById('pull-status');

        if (!modelName) {
            statusEl.textContent = '모델명을 입력해주세요';
            statusEl.className = 'status-message error';
            return;
        }

        try {
            const pullBtn = document.getElementById('pull-btn');
            pullBtn.disabled = true;
            pullBtn.textContent = '다운로드 중...';
            statusEl.textContent = '다운로드 시작...';
            statusEl.className = 'status-message';

            const response = await fetch('/api/pull', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: modelName
                })
            });

            const data = await response.json();

            if (data.success) {
                statusEl.textContent = data.message;
                statusEl.className = 'status-message success';
                input.value = '';
                await this.loadModels();
            } else {
                statusEl.textContent = '에러: ' + data.message;
                statusEl.className = 'status-message error';
            }
        } catch (error) {
            statusEl.textContent = '다운로드 실패: ' + error.message;
            statusEl.className = 'status-message error';
        } finally {
            const pullBtn = document.getElementById('pull-btn');
            pullBtn.disabled = false;
            pullBtn.textContent = '다운로드';
        }
    }

    async deleteModel(modelName) {
        if (!confirm(`"${modelName}" 모델을 삭제하시겠습니까?`)) {
            return;
        }

        try {
            const response = await fetch('/api/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: modelName
                })
            });

            const data = await response.json();

            if (data.success) {
                await this.loadModels();

                // 선택된 모델이 삭제되었으면 초기화
                if (this.currentModel === modelName) {
                    this.currentModel = null;
                    this.messages = [];
                    document.getElementById('model-select').value = '';
                    this.updateChatDisplay();
                }
            } else {
                alert('삭제 실패: ' + data.message);
            }
        } catch (error) {
            alert('삭제 중 에러 발생: ' + error.message);
        }
    }
}

// Initialize when DOM is ready
let chat;
document.addEventListener('DOMContentLoaded', () => {
    chat = new OllamaChat();
});
