from flask_sqlalchemy import SQLAlchemy
import bcrypt
from datetime import datetime
import json

db = SQLAlchemy()

class User(db.Model):
    """사용자 모델"""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # 관계
    conversations = db.relationship('Conversation', backref='user', lazy=True, cascade='all, delete-orphan')

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


class Conversation(db.Model):
    """대화 세션 모델"""
    __tablename__ = 'conversations'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    model_used = db.Column(db.String(100), nullable=True)  # 마지막으로 사용한 모델
    is_deleted = db.Column(db.Boolean, default=False)  # 소프트 삭제
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 관계
    messages = db.relationship('Message', backref='conversation', lazy=True, cascade='all, delete-orphan')

    def to_dict(self, include_messages=False):
        """딕셔너리로 변환"""
        data = {
            'id': self.id,
            'title': self.title,
            'model_used': self.model_used,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
        if include_messages:
            data['messages'] = [msg.to_dict() for msg in self.messages]
        return data


class Message(db.Model):
    """메시지 모델"""
    __tablename__ = 'messages'

    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey('conversations.id'), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # 'user' 또는 'assistant'
    content = db.Column(db.Text, nullable=False)
    image = db.Column(db.Text, nullable=True)  # base64 encoded image
    metrics = db.Column(db.JSON, nullable=True)  # {tokens_per_second, generation_time_sec, ...}
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def to_dict(self):
        """딕셔너리로 변환"""
        return {
            'id': self.id,
            'role': self.role,
            'content': self.content,
            'image': self.image,
            'metrics': self.metrics,
            'created_at': self.created_at.isoformat()
        }
