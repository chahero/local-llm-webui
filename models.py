from flask_sqlalchemy import SQLAlchemy
import bcrypt
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    """사용자 모델"""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password: str):
        """비밀번호를 해싱해서 저장"""
        salt = bcrypt.gensalt()
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

    def check_password(self, password: str) -> bool:
        """비밀번호 확인"""
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))

    def to_dict(self):
        """딕셔너리로 변환"""
        return {
            'id': self.id,
            'username': self.username,
            'created_at': self.created_at.isoformat()
        }
