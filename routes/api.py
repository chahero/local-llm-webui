from flask import Blueprint, request, jsonify, Response, session, current_app
from utils.ollama_client import OllamaClient
from utils.decorators import login_required
from models import db, Conversation, Message, User
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
    """채팅 (스트리밍) - 메시지 저장 포함"""
    data = request.json
    model = data.get('model')
    messages = data.get('messages', [])
    conversation_id = data.get('conversation_id')
    user_message = data.get('user_message')  # 사용자 메시지와 이미지

    if not model:
        return jsonify({"success": False, "message": "모델을 선택해주세요"}), 400

    if not messages:
        return jsonify({"success": False, "message": "메시지가 필요합니다"}), 400

    # 대화 조회 및 권한 확인
    conversation = None
    conv_id = None
    if conversation_id:
        conversation = Conversation.query.filter_by(
            id=conversation_id,
            user_id=session.get('user_id')
        ).first()
        if not conversation:
            return jsonify({"success": False, "message": "대화를 찾을 수 없습니다"}), 404

        # conversation.id를 미리 저장 (세션 종료 후 접근 방지)
        conv_id = conversation.id

    # 사용자 메시지 먼저 저장
    if conversation and user_message:
        user_msg = Message(
            conversation_id=conv_id,
            role='user',
            content=user_message.get('content', ''),
            image=user_message.get('image')
        )
        db.session.add(user_msg)
        db.session.commit()

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
        full_content = ''
        metrics = {}
        try:
            for line in response.iter_lines(decode_unicode=True):
                if line:
                    try:
                        chunk = json.loads(line)
                        # Ollama 응답은 message.content 형식
                        message = chunk.get('message', {})
                        response_text = message.get('content', '')
                        full_content += response_text

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

        # 최종 응답 완료 신호 (클라이언트에서 저장하도록)
        yield json.dumps({
            "success": True,
            "done": True,
            "full_content": full_content,
            "metrics": metrics,
            "conversation_id": conv_id,
            "model": model
        }) + '\n'

    return Response(generate(), mimetype='application/x-ndjson')

@api_bp.route('/save-message', methods=['POST'])
@login_required
def save_message():
    """AI 응답 메시지 저장 (클라이언트에서 호출)"""
    data = request.json
    conversation_id = data.get('conversation_id')
    full_content = data.get('content', '')
    metrics = data.get('metrics')
    model = data.get('model')

    try:
        conversation = Conversation.query.filter_by(
            id=conversation_id,
            user_id=session.get('user_id')
        ).first()

        if not conversation:
            return jsonify({"success": False, "message": "대화를 찾을 수 없습니다"}), 404

        # AI 응답 저장
        assistant_msg = Message(
            conversation_id=conversation.id,
            role='assistant',
            content=full_content,
            metrics=metrics if metrics else None
        )
        db.session.add(assistant_msg)

        # 대화 업데이트
        conversation.model_used = model
        conversation.updated_at = db.func.now()

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "메시지가 저장되었습니다"
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"저장 실패: {str(e)}"
        }), 500

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


# ============ 대화 이력 관련 API ============

@api_bp.route('/conversations', methods=['GET'])
@login_required
def get_conversations():
    """사용자의 모든 대화 목록 조회 (최신순)"""
    user_id = session.get('user_id')
    conversations = Conversation.query.filter_by(
        user_id=user_id,
        is_deleted=False
    ).order_by(Conversation.updated_at.desc()).all()

    return jsonify({
        "success": True,
        "conversations": [conv.to_dict() for conv in conversations]
    })


@api_bp.route('/conversations', methods=['POST'])
@login_required
def create_conversation():
    """새 대화 생성"""
    user_id = session.get('user_id')
    data = request.json
    title = data.get('title', '새로운 대화')

    if not title:
        title = '새로운 대화'

    conversation = Conversation(
        user_id=user_id,
        title=title
    )
    db.session.add(conversation)
    db.session.commit()

    return jsonify({
        "success": True,
        "conversation": conversation.to_dict()
    }), 201


@api_bp.route('/conversations/<int:conversation_id>', methods=['GET'])
@login_required
def get_conversation(conversation_id):
    """특정 대화 조회 (메시지 포함)"""
    user_id = session.get('user_id')
    conversation = Conversation.query.filter_by(
        id=conversation_id,
        user_id=user_id,
        is_deleted=False
    ).first()

    if not conversation:
        return jsonify({"success": False, "message": "대화를 찾을 수 없습니다"}), 404

    return jsonify({
        "success": True,
        "conversation": conversation.to_dict(include_messages=True)
    })


@api_bp.route('/conversations/<int:conversation_id>', methods=['DELETE'])
@login_required
def delete_conversation(conversation_id):
    """대화 삭제 (소프트 삭제)"""
    user_id = session.get('user_id')
    conversation = Conversation.query.filter_by(
        id=conversation_id,
        user_id=user_id
    ).first()

    if not conversation:
        return jsonify({"success": False, "message": "대화를 찾을 수 없습니다"}), 404

    conversation.is_deleted = True
    db.session.commit()

    return jsonify({"success": True, "message": "대화가 삭제되었습니다"})


@api_bp.route('/conversations/<int:conversation_id>/title', methods=['PUT'])
@login_required
def update_conversation_title(conversation_id):
    """대화 제목 수정"""
    user_id = session.get('user_id')
    conversation = Conversation.query.filter_by(
        id=conversation_id,
        user_id=user_id
    ).first()

    if not conversation:
        return jsonify({"success": False, "message": "대화를 찾을 수 없습니다"}), 404

    data = request.json
    title = data.get('title')

    if not title:
        return jsonify({"success": False, "message": "제목은 필수입니다"}), 400

    conversation.title = title
    db.session.commit()

    return jsonify({
        "success": True,
        "conversation": conversation.to_dict()
    })
