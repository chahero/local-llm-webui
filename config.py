import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """기본 설정"""
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
    OLLAMA_API_URL = os.getenv('OLLAMA_API_URL', 'http://localhost:11434')
    DEBUG = os.getenv('FLASK_DEBUG', False)
    SERVER_PORT = int(os.getenv('SERVER_PORT', 5000))

    # SQLite 설정 - 항상 절대 경로 사용
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    INSTANCE_PATH = os.path.join(BASE_DIR, 'instance')
    if not os.path.exists(INSTANCE_PATH):
        os.makedirs(INSTANCE_PATH, exist_ok=True)
    DATABASE_PATH = os.path.join(INSTANCE_PATH, 'app.db')
    # SQLite URL format: sqlite:/// + absolute_path
    SQLALCHEMY_DATABASE_URI = f'sqlite:///{DATABASE_PATH}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
