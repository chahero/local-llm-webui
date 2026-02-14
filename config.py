import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Application configuration."""
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
    OLLAMA_API_URL = os.getenv('OLLAMA_API_URL', 'http://localhost:11434')
    DEBUG = str(os.getenv('FLASK_DEBUG', 'False')).lower() in (
        '1', 'true', 't', 'yes', 'y', 'on'
    )
    SERVER_PORT = int(os.getenv('SERVER_PORT', 5000))

    # SQLite 설정 - 항상 절대 경로 사용
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    DATABASE_PATH = os.getenv(
        'DATABASE_PATH',
        os.path.join(BASE_DIR, 'instance', 'app.db')
    )
    if not os.path.isabs(DATABASE_PATH):
        DATABASE_PATH = os.path.normpath(os.path.join(BASE_DIR, DATABASE_PATH))
    INSTANCE_PATH = os.path.dirname(DATABASE_PATH)
    if not os.path.exists(INSTANCE_PATH):
        os.makedirs(INSTANCE_PATH, exist_ok=True)
    SQLALCHEMY_DATABASE_URI = f'sqlite:///{DATABASE_PATH}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
