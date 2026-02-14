import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Application configuration."""
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
    OLLAMA_API_URL = os.getenv('OLLAMA_API_URL', 'http://localhost:11434')
    DEBUG = os.getenv('FLASK_DEBUG', False)
    SERVER_PORT = int(os.getenv('SERVER_PORT', 5000))

    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    DATABASE_PATH = os.getenv(
        'DATABASE_PATH',
        os.path.join(BASE_DIR, 'instance', 'app.db')
    )
    if not os.path.isabs(DATABASE_PATH):
        DATABASE_PATH = os.path.normpath(os.path.join(BASE_DIR, DATABASE_PATH))

    SQLALCHEMY_DATABASE_URI = f'sqlite:///{DATABASE_PATH}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
