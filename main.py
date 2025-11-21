from flask import Flask, render_template, redirect, url_for, session
from config import Config
from models import db
from routes.api import api_bp
from routes.auth import auth_bp

def create_app():
    """Flask app factory"""
    app = Flask(__name__)
    app.config.from_object(Config)

    # SQLAlchemy 초기화
    db.init_app(app)

    # DB 테이블 생성
    with app.app_context():
        db.create_all()

    # Register blueprints
    app.register_blueprint(api_bp)
    app.register_blueprint(auth_bp)

    @app.route('/')
    def index():
        """Main page (로그인 필수)"""
        # 로그인 확인
        if not session.get('user_id'):
            return redirect(url_for('login'))
        return render_template('index.html')

    @app.route('/login')
    def login():
        """Login page"""
        # 이미 로그인한 경우 index로 리다이렉트
        if session.get('user_id'):
            return redirect(url_for('index'))
        return render_template('login.html')

    @app.route('/admin')
    def admin():
        """Admin page (관리자 권한 필수)"""
        # 로그인 확인
        if not session.get('user_id'):
            return redirect(url_for('login'))

        # 관리자 권한 확인
        from models import User
        user = User.query.get(session.get('user_id'))
        if not user or not user.is_admin:
            return redirect(url_for('index'))

        return render_template('admin.html')

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=Config.SERVER_PORT)
