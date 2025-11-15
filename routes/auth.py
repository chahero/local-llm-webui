from flask import Blueprint, request, jsonify, session
from models import db, User
from utils.decorators import login_required

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

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

    # 세션에 사용자 ID 저장
    session['user_id'] = user.id
    session['username'] = user.username

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
        "user": user.to_dict()
    }), 200

@auth_bp.route('/register', methods=['POST'])
def register():
    """신규 사용자 등록 (개발 전용)"""
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '')

    if not username or not password:
        return jsonify({"success": False, "message": "사용자명과 비밀번호를 입력해주세요"}), 400

    if len(password) < 4:
        return jsonify({"success": False, "message": "비밀번호는 최소 4자 이상이어야 합니다"}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"success": False, "message": "이미 존재하는 사용자명입니다"}), 400

    user = User(username=username)
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "사용자 등록 성공",
        "user": user.to_dict()
    }), 201
