class OllamaChat {
    constructor() {
        this.currentModel = null;
        this.messages = [];
        this.models = [];
        this.selectedImage = null;  // 선택된 이미지 저장
        this.init();
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
        this.setupEventListeners();
        await this.checkConnection();
        await this.loadModels();
    }

    setupEventListeners() {
        // 채팅
        document.getElementById('send-btn').addEventListener('click', () => this.sendMessage());
        document.getElementById('message-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                this.sendMessage();
            }
        });

        document.getElementById('model-select').addEventListener('change', (e) => {
            this.currentModel = e.target.value;
            this.messages = [];
            this.updateChatDisplay();
        });

        // 모달
        document.getElementById('models-btn').addEventListener('click', () => this.openModal());
        document.getElementById('close-modal-btn').addEventListener('click', () => this.closeModal());
        document.getElementById('modal-overlay').addEventListener('click', () => this.closeModal());

        // 모달 드래그
        const modalHeader = document.getElementById('modal-header');
        modalHeader.addEventListener('mousedown', (e) => this.startDragModal(e));

        // 모달 크기 조절
        const resizeHandle = document.getElementById('resize-handle');
        resizeHandle.addEventListener('mousedown', (e) => this.startResizeModal(e));

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
        document.getElementById('models-modal').classList.add('active');
        document.getElementById('modal-overlay').classList.add('active');
    }

    closeModal() {
        document.getElementById('models-modal').classList.remove('active');
        document.getElementById('modal-overlay').classList.remove('active');
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

    async checkConnection() {
        try {
            const response = await fetch('/api/health');
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
            const data = await response.json();

            if (data.success) {
                this.models = data.models || [];
                this.updateModelDisplay();
            } else {
                console.error('Failed to load models:', data.message);
            }
        } catch (error) {
            console.error('Error loading models:', error);
        }
    }

    updateModelDisplay() {
        const listContainer = document.getElementById('models-list');
        const select = document.getElementById('model-select');

        // Clear and rebuild
        listContainer.innerHTML = '';
        select.innerHTML = '<option value="">모델을 선택해주세요</option>';

        if (this.models.length === 0) {
            listContainer.innerHTML = '<p class="loading">설치된 모델이 없습니다</p>';
            return;
        }

        this.models.forEach(model => {
            // Add to modal list
            const modelEl = document.createElement('div');
            modelEl.className = 'model-item';

            const infoEl = document.createElement('div');
            infoEl.className = 'model-item-info';

            const nameEl = document.createElement('span');
            nameEl.className = 'model-item-name';
            nameEl.textContent = model.name;

            const sizeEl = document.createElement('span');
            sizeEl.className = 'model-item-size';
            const sizeText = model.size ? this.formatBytes(model.size) : '크기 불명';
            sizeEl.textContent = sizeText;

            infoEl.appendChild(nameEl);
            infoEl.appendChild(sizeEl);

            const actionsEl = document.createElement('div');
            actionsEl.className = 'model-item-actions';

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-delete';
            deleteBtn.textContent = '삭제';
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

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.currentModel,
                    messages: messagesForAPI
                })
            });

            const data = await response.json();

            if (data.success) {
                this.messages.push({
                    role: 'assistant',
                    content: data.message
                });
            } else {
                this.messages.push({
                    role: 'assistant',
                    content: '에러: ' + data.message
                });
            }

            this.updateChatDisplay();
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
            container.innerHTML = '<div class="empty-state"><p>모델을 선택하고 메시지를 입력해주세요</p></div>';
            return;
        }

        container.innerHTML = '';
        this.messages.forEach(msg => {
            const messageEl = document.createElement('div');
            messageEl.className = `message ${msg.role}`;

            const contentEl = document.createElement('div');
            contentEl.className = 'message-content';
            contentEl.textContent = msg.content;

            messageEl.appendChild(contentEl);

            // 이미지가 있으면 표시 (사용자 메시지만)
            if (msg.images && msg.role === 'user') {
                const imageEl = document.createElement('div');
                imageEl.className = 'message-image';
                const img = document.createElement('img');
                img.src = 'data:image/jpeg;base64,' + msg.images[0];
                imageEl.appendChild(img);
                messageEl.appendChild(imageEl);
            }

            container.appendChild(messageEl);
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
document.addEventListener('DOMContentLoaded', () => {
    new OllamaChat();
});
