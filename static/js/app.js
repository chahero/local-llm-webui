class OllamaChat {
    constructor() {
        this.currentModel = null;
        this.messages = [];
        this.models = [];
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.checkConnection();
        await this.loadModels();
    }

    setupEventListeners() {
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

        document.getElementById('pull-btn').addEventListener('click', () => this.pullModel());
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
        const container = document.getElementById('models-container');
        const select = document.getElementById('model-select');

        // Clear and rebuild
        container.innerHTML = '';
        select.innerHTML = '<option value="">모델을 선택해주세요</option>';

        if (this.models.length === 0) {
            container.innerHTML = '<p class="loading">설치된 모델이 없습니다</p>';
            return;
        }

        this.models.forEach(model => {
            // Add to sidebar
            const modelEl = document.createElement('div');
            modelEl.className = 'model-item';

            const nameEl = document.createElement('span');
            nameEl.className = 'model-item-name';
            nameEl.textContent = model.name;

            const actionsEl = document.createElement('div');
            actionsEl.className = 'model-item-actions';

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-delete';
            deleteBtn.textContent = '삭제';
            deleteBtn.addEventListener('click', () => this.deleteModel(model.name));

            actionsEl.appendChild(deleteBtn);
            modelEl.appendChild(nameEl);
            modelEl.appendChild(actionsEl);
            container.appendChild(modelEl);

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

        if (!message) return;
        if (!this.currentModel) {
            alert('모델을 선택해주세요');
            return;
        }

        // Add user message
        this.messages.push({
            role: 'user',
            content: message
        });

        input.value = '';
        this.updateChatDisplay();

        // Send to server
        try {
            const sendBtn = document.getElementById('send-btn');
            sendBtn.disabled = true;
            sendBtn.textContent = '응답 중...';

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.currentModel,
                    messages: this.messages
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
