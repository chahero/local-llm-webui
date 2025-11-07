from flask import Blueprint, request, jsonify
from utils.ollama_client import OllamaClient

api_bp = Blueprint('api', __name__, url_prefix='/api')
ollama = OllamaClient()

@api_bp.route('/health', methods=['GET'])
def health_check():
    """Ollama 서버 연결 확인"""
    result = ollama.check_connection()
    return jsonify(result)

@api_bp.route('/models', methods=['GET'])
def get_models():
    """모델 목록 조회"""
    result = ollama.get_models()
    return jsonify(result)

@api_bp.route('/chat', methods=['POST'])
def chat():
    """채팅"""
    data = request.json
    model = data.get('model')
    messages = data.get('messages', [])

    if not model:
        return jsonify({"success": False, "message": "모델을 선택해주세요"}), 400

    if not messages:
        return jsonify({"success": False, "message": "메시지가 필요합니다"}), 400

    result = ollama.chat(model, messages, stream=False)
    return jsonify(result)

@api_bp.route('/pull', methods=['POST'])
def pull_model():
    """모델 다운로드"""
    data = request.json
    model_name = data.get('model')

    if not model_name:
        return jsonify({"success": False, "message": "모델명을 입력해주세요"}), 400

    result = ollama.pull_model(model_name)
    return jsonify(result)

@api_bp.route('/delete', methods=['POST'])
def delete_model():
    """모델 삭제"""
    data = request.json
    model_name = data.get('model')

    if not model_name:
        return jsonify({"success": False, "message": "모델명을 입력해주세요"}), 400

    result = ollama.delete_model(model_name)
    return jsonify(result)
