from flask import session, jsonify
from functools import wraps

def login_required(f):
    """로그인이 필요한 라우트를 보호하는 데코레이터"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = session.get('user_id')

        if not user_id:
            return jsonify({"success": False, "message": "로그인이 필요합니다"}), 401

        return f(*args, **kwargs)

    return decorated_function
