# Local LLM WebUI

[🇪🇸 English](README.md) | [🇰🇷 한국어](README.ko.md)

A modern web-based LLM interface that integrates with Ollama. Designed to make it easy to use large language models on your local machine.

## ✨ Key Features

- **💬 Real-time Streaming Chat** - Real-time conversation support with Ollama models
- **🔐 User Authentication** - Sign up/Login with SQLite database (bcrypt password hashing)
- **💾 Conversation History** - Save, load, rename, and delete conversations
- **📊 Message Storage** - Store all messages, images, and metrics in database
- **🤖 Model Tracking** - Use multiple models in one conversation, track which model generated each response
- **⚡ Performance Metrics** - Display token speed, generation time, prompt processing time, and model load time
- **📦 Model Management** - Install, delete, and download models
- **🖼️ Image Upload** - Send images with messages (drag and drop support)
- **📝 Markdown Rendering** - Display AI responses as markdown
- **💻 Code Highlighting** - Syntax highlighting for code blocks
- **📱 Responsive Design** - Perfect support for desktop and mobile
- **🎨 Modern UI** - Elegant dark theme based on Tailwind CSS

## 📋 System Requirements

- Python 3.8+
- Ollama (Installation: https://ollama.ai)
- Minimum 4GB RAM (recommended: 8GB or more)

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd local-llm-webui
```

### 2. Install Python Dependencies
```bash
pip install -r requirements.txt
```

### 3. Environment Configuration
Edit the `.env` file (required):
```env
# Ollama server address
OLLAMA_API_URL=http://localhost:11434

# Flask settings
FLASK_DEBUG=True
SECRET_KEY=your-secret-key-here

# Server port
SERVER_PORT=5001

# SQLite settings
DATABASE_PATH=./instance/app.db
```

### 4. Run the Server
```bash
python main.py
```

Once the server starts, open your browser and navigate to:
```
http://localhost:5001
```

## 💡 Usage

### First Run
1. Click "Sign Up" on the login page
2. Create a new account (username, password)
3. Log in

### Chat Usage
1. Select a model from the top of the page
2. Enter your message and press **Enter** or click the send button
3. **Shift + Enter** - Create a new line in the message input

### Image Upload
- Click the 🖼️ button to select an image
- Or drag and drop an image into the message area
- Or paste an image from clipboard with Ctrl+V

### Model Management
1. Click the "⚙️ Model Management" button in the top right
2. **Installed Models** - View and delete currently installed models
3. **Download Model** - Install new models (e.g., llama2, mistral, neural-chat)

## 📁 Project Structure

```
local-llm-webui/
├── main.py                 # Flask application entry point
├── config.py              # Configuration file
├── models.py              # SQLAlchemy User model
├── requirements.txt       # Python dependencies
├── .env                   # Environment variable settings
├── instance/app.db                 # SQLite database (auto-created)
├── routes/
│   ├── api.py            # Chat/model management API
│   └── auth.py           # Authentication API (login/logout)
├── utils/
│   ├── ollama_client.py  # Ollama API client
│   └── decorators.py     # Login-required decorator
├── templates/
│   ├── index.html        # Chat page
│   └── login.html        # Login page
└── static/
    ├── css/
    │   └── style.css     # (Replaced with Tailwind CSS)
    └── js/
        └── app.js        # Frontend logic
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout (login required)
- `GET /api/auth/check` - Check login status
- `POST /api/auth/register` - Register

### Chat & Models
- `GET /api/health` - Check Ollama server status (login required)
- `GET /api/models` - List models (login required)
- `POST /api/chat` - Chat with streaming (login required)
- `POST /api/save-message` - Save AI response message (login required)
- `POST /api/pull` - Download model (login required)
- `POST /api/delete` - Delete model (login required)

### Conversation History
- `GET /api/conversations` - Get all user conversations (login required)
- `POST /api/conversations` - Create new conversation (login required)
- `GET /api/conversations/{id}` - Get specific conversation with messages (login required)
- `PUT /api/conversations/{id}/title` - Update conversation title (login required)
- `DELETE /api/conversations/{id}` - Delete conversation (soft delete, login required)

## ⚙️ Configuration Options

### .env File Description

| Variable | Description | Default |
|----------|-------------|---------|
| OLLAMA_API_URL | Ollama server address | http://localhost:11434 |
| FLASK_DEBUG | Flask Debug mode | True |
| SECRET_KEY | Flask session encryption key | dev-secret-key |
| SERVER_PORT | Web server port | 5001 |
| DATABASE_PATH | SQLite DB path | ./instance/app.db |

## 🔒 Security

- **Passwords**: Securely stored with bcrypt hashing
- **Sessions**: Login state managed with Flask sessions
- **XSS Prevention**: User input validated with DOMPurify
- **CSRF**: Basic Flask CSRF protection

> ⚠️ **Warning**: This is a development environment. Additional security measures are required for production deployment.

## 🐛 Troubleshooting

### Ollama Connection Failed
```
Error: "Cannot connect to Ollama server"
Solution:
1. Verify Ollama server is running
2. Check that OLLAMA_API_URL is correct
3. Check firewall settings
```

### Model Download Failed
```
Error: "Download failed"
Solution:
1. Check internet connection
2. Verify model name (https://ollama.ai/library)
3. Check available disk space
```

### Database Reset
```bash
rm instance/app.db
python main.py  # New database will be created automatically
```

## 🎨 UI Tech Stack

- **HTML5** - Structure
- **Tailwind CSS** - Styling (CDN)
- **JavaScript** - Interactions
- **Marked.js** - Markdown parsing
- **Highlight.js** - Code highlighting
- **DOMPurify** - XSS prevention

## 🛠️ Development Mode

Already enabled features:
- ✅ Debug mode (`debug=True`)
- ✅ Auto-reload (automatically restarts on file changes)
- ✅ Detailed error messages

The server will automatically restart when you modify Python files.

## 📝 Changelog

### v1.1.0
- **Conversation History** - Save, load, rename, and delete conversations
- **Message Storage** - Store all messages, images, and metrics in database
- **Model Tracking** - Track which model generated each response in multi-model conversations
- **Performance Metrics** - Display token speed, generation time, prompt processing time, and model load time
- **UI Improvements** - Beautiful gradient-styled delete button
- **UX Enhancements** - Integrated model information with metrics display

### v1.0.0
- UI redesign with Tailwind CSS
- Login/authentication system added
- Streaming chat implemented
- Mobile responsive support

## 📄 License

MIT License

## 🤝 Contributing

Please report bugs or suggest features through issues.

## ❓ FAQ

**Q: How do I install models?**
A: Go to Model Management → Download Model and enter the model name. It will install automatically. (e.g., llama2, mistral)

**Q: Does it support multiple users?**
A: Yes, each user can log in with their own account. Each user's conversation history and messages are managed separately.

**Q: Can I use multiple models in one conversation?**
A: Yes! You can switch models within the same conversation. Each AI response automatically records which model was used, so you can compare responses from different models.

**Q: Can I view previous conversations?**
A: Yes, click on any conversation in the left sidebar to load the full message history. Conversations are automatically sorted by date.

**Q: Where can I see performance information?**
A: Performance metrics are displayed below each AI response, including token speed, generation time, prompt processing time, and model load time.

**Q: Can I deploy to a remote server?**
A: Yes, but production configuration is required. It's recommended to change `SECRET_KEY` and set up HTTPS.

**Q: Which models do you recommend?**
A: Beginner: llama2, mistral / Advanced: neural-chat, orca-mini

---

**Created**: November 2025
**Version**: 1.1.0

