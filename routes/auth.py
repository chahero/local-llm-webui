from flask import Blueprint, request, jsonify, session
from models import db, User
from utils.decorators import login_required

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

def admin_required(f):
    """관리자 권한 필요 데코레이터"""
    def decorated_function(*args, **kwargs):
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({"success": False, "message": "로그인이 필요합니다"}), 401

        user = User.query.get(user_id)
        if not user or not user.is_admin:
            return jsonify({"success": False, "message": "관리자 권한이 필요합니다"}), 403

        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

@auth_bp.route('/login', methods=['POST'])
def login():
    """로그인"""
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '')

    if not username or not password:
        return jsonify({"success": False, "message": "사용자명과 비밀번호를 입력해주세요"}), 400

    user = User.query.filter_by(username=username).first()

    if not user or not user.check_password(password):
        return jsonify({"success": False, "message": "사용자명 또는 비밀번호가 잘못되었습니다"}), 401

    if not user.is_approved:
        return jsonify({"success": False, "message": "관리자의 승인을 기다리고 있습니다"}), 403

    # 세션에 사용자 ID 저장
    session['user_id'] = user.id
    session['username'] = user.username
    session['is_admin'] = user.is_admin

    return jsonify({
        "success": True,
        "message": "로그인 성공",
        "user": user.to_dict()
    }), 200

@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    """로그아웃"""
    session.clear()
    return jsonify({"success": True, "message": "로그아웃 되었습니다"}), 200

@auth_bp.route('/check', methods=['GET'])
def check_auth():
    """현재 로그인 상태 확인"""
    user_id = session.get('user_id')

    if not user_id:
        return jsonify({"authenticated": False}), 200

    user = User.query.get(user_id)
    if not user:
        session.clear()
        return jsonify({"authenticated": False}), 200

    return jsonify({
        "authenticated": True,
        "user": user.to_dict(),
        "is_admin": user.is_admin
    }), 200

@auth_bp.route('/register', methods=['POST'])
def register():
    """신규 사용자 등록"""
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '')

    if not username or not password:
        return jsonify({"success": False, "message": "사용자명과 비밀번호를 입력해주세요"}), 400

    if len(password) < 4:
        return jsonify({"success": False, "message": "비밀번호는 최소 4자 이상이어야 합니다"}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"success": False, "message": "이미 존재하는 사용자명입니다"}), 400

    # 첫 번째 사용자인 경우 자동으로 관리자로 등록
    is_first_user = User.query.count() == 0

    user = User(username=username)
    user.set_password(password)
    user.is_admin = is_first_user
    user.is_approved = is_first_user

    db.session.add(user)
    db.session.commit()

    if is_first_user:
        message = "첫 번째 사용자로 관리자로 등록되었습니다"
    else:
        message = "사용자 등록이 요청되었습니다. 관리자의 승인을 기다려주세요"

    return jsonify({
        "success": True,
        "message": message,
        "user": user.to_dict()
    }), 201

@auth_bp.route('/users', methods=['GET'])
@admin_required
def get_users():
    """모든 사용자 목록 조회 (관리자만)"""
    users = User.query.all()
    return jsonify({
        "success": True,
        "users": [user.to_dict() for user in users]
    }), 200

@auth_bp.route('/users/<int:user_id>/approve', methods=['POST'])
@admin_required
def approve_user(user_id):
    """사용자 승인 (관리자만)"""
    user = User.query.get(user_id)

    if not user:
        return jsonify({"success": False, "message": "사용자를 찾을 수 없습니다"}), 404

    user.is_approved = True
    db.session.commit()

    return jsonify({
        "success": True,
        "message": f"{user.username} 사용자가 승인되었습니다",
        "user": user.to_dict()
    }), 200

@auth_bp.route('/users/<int:user_id>/reject', methods=['POST'])
@admin_required
def reject_user(user_id):
    """사용자 거부 및 삭제 (관리자만)"""
    user = User.query.get(user_id)

    if not user:
        return jsonify({"success": False, "message": "사용자를 찾을 수 없습니다"}), 404

    if user.is_admin:
        return jsonify({"success": False, "message": "관리자는 삭제할 수 없습니다"}), 400

    username = user.username
    db.session.delete(user)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": f"{username} 사용자가 거부되었습니다"
    }), 200
