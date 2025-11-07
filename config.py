import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """기본 설정"""
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
    OLLAMA_API_URL = os.getenv('OLLAMA_API_URL', 'http://localhost:11434')
    DEBUG = os.getenv('FLASK_DEBUG', False)
    SERVER_PORT = int(os.getenv('SERVER_PORT', 5000))
