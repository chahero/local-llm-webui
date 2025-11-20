from flask import Blueprint, request, jsonify, Response
from utils.ollama_client import OllamaClient
from utils.decorators import login_required
import json

api_bp = Blueprint('api', __name__, url_prefix='/api')
ollama = OllamaClient()

@api_bp.route('/health', methods=['GET'])
@login_required
def health_check():
    """Ollama 서버 연결 확인"""
    result = ollama.check_connection()
    return jsonify(result)

@api_bp.route('/models', methods=['GET'])
@login_required
def get_models():
    """모델 목록 조회"""
    result = ollama.get_models()
    return jsonify(result)

@api_bp.route('/chat', methods=['POST'])
@login_required
def chat():
    """채팅 (스트리밍)"""
    data = request.json
    model = data.get('model')
    messages = data.get('messages', [])

    if not model:
        return jsonify({"success": False, "message": "모델을 선택해주세요"}), 400

    if not messages:
        return jsonify({"success": False, "message": "메시지가 필요합니다"}), 400

    def generate():
        """스트리밍 응답 생성"""
        result = ollama.chat(model, messages, stream=True)

        if not result.get('success'):
            yield json.dumps({"success": False, "message": result.get('message', '알 수 없는 에러')}) + '\n'
            return

        response = result.get('response')
        if response is None:
            yield json.dumps({"success": False, "message": "응답이 없습니다"}) + '\n'
            return

        # Ollama 스트리밍 응답을 클라이언트에 전달
        try:
            for line in response.iter_lines(decode_unicode=True):
                if line:
                    try:
                        chunk = json.loads(line)
                        # Ollama 응답은 message.content 형식
                        message = chunk.get('message', {})
                        response_text = message.get('content', '')

                        # 응답 데이터 구성
                        response_data = {
                            "success": True,
                            "chunk": response_text,
                            "done": chunk.get('done', False)
                        }

                        # done이 true일 때 성능 메트릭 포함
                        if chunk.get('done', False):
                            metrics = {}

                            # 토큰 속도 계산 (tokens/sec)
                            eval_count = chunk.get('eval_count', 0)
                            eval_duration = chunk.get('eval_duration', 0)
                            if eval_count > 0 and eval_duration > 0:
                                tokens_per_sec = eval_count / (eval_duration / 1e9)
                                metrics['tokens_per_second'] = round(tokens_per_sec, 2)

                            # 생성 시간 (초)
                            if eval_duration > 0:
                                metrics['generation_time_sec'] = round(eval_duration / 1e9, 2)

                            # 프롬프트 처리 시간 (초)
                            prompt_eval_duration = chunk.get('prompt_eval_duration', 0)
                            if prompt_eval_duration > 0:
                                metrics['prompt_processing_time_sec'] = round(prompt_eval_duration / 1e9, 2)

                            # 모델 로드 시간 (초)
                            load_duration = chunk.get('load_duration', 0)
                            if load_duration > 0:
                                metrics['load_time_sec'] = round(load_duration / 1e9, 2)

                            if metrics:
                                response_data['metrics'] = metrics

                        yield json.dumps(response_data) + '\n'
                    except json.JSONDecodeError as e:
                        continue
        except Exception as e:
            yield json.dumps({"success": False, "message": str(e)}) + '\n'

    return Response(generate(), mimetype='application/x-ndjson')

@api_bp.route('/pull', methods=['POST'])
@login_required
def pull_model():
    """모델 다운로드"""
    data = request.json
    model_name = data.get('model')

    if not model_name:
        return jsonify({"success": False, "message": "모델명을 입력해주세요"}), 400

    result = ollama.pull_model(model_name)
    return jsonify(result)

@api_bp.route('/delete', methods=['POST'])
@login_required
def delete_model():
    """모델 삭제"""
    data = request.json
    model_name = data.get('model')

    if not model_name:
        return jsonify({"success": False, "message": "모델명을 입력해주세요"}), 400

    result = ollama.delete_model(model_name)
    return jsonify(result)
