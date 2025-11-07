from flask import Flask, render_template
from config import Config
from routes.api import api_bp

def create_app():
    """Flask app factory"""
    app = Flask(__name__)
    app.config.from_object(Config)

    # Register blueprints
    app.register_blueprint(api_bp)

    @app.route('/')
    def index():
        """Main page"""
        return render_template('index.html')

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)
