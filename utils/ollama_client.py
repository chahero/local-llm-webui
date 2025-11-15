import requests
from typing import Optional, Dict, List
from config import Config

class OllamaClient:
    """Ollama API 클라이언트"""

    def __init__(self, base_url: Optional[str] = None):
        self.base_url = base_url or Config.OLLAMA_API_URL
        self.timeout = 30

    def check_connection(self) -> Dict:
        """Ollama 서버 연결 확인"""
        try:
            response = requests.get(
                f"{self.base_url}/api/tags",
                timeout=self.timeout
            )
            if response.status_code == 200:
                return {
                    "connected": True,
                    "message": "Ollama 서버 연결 성공"
                }
            else:
                return {
                    "connected": False,
                    "message": f"서버 응답 에러: {response.status_code}"
                }
        except requests.exceptions.ConnectionError:
            return {
                "connected": False,
                "message": "Ollama 서버에 연결할 수 없습니다"
            }
        except Exception as e:
            return {
                "connected": False,
                "message": f"에러 발생: {str(e)}"
            }

    def get_models(self) -> Dict:
        """설치된 모델 목록 조회"""
        try:
            response = requests.get(
                f"{self.base_url}/api/tags",
                timeout=self.timeout
            )
            if response.status_code == 200:
                data = response.json()
                models = data.get('models', [])
                return {
                    "success": True,
                    "models": models,
                    "count": len(models)
                }
            else:
                return {
                    "success": False,
                    "message": f"에러: {response.status_code}"
                }
        except Exception as e:
            return {
                "success": False,
                "message": f"모델 목록 조회 실패: {str(e)}"
            }

    def chat(self, model: str, messages: List[Dict], stream: bool = False) -> Dict:
        """채팅 API 호출 (스트리밍 지원)"""
        try:
            payload = {
                "model": model,
                "messages": messages,
                "stream": stream
            }

            response = requests.post(
                f"{self.base_url}/api/chat",
                json=payload,
                timeout=None if stream else self.timeout * 10,  # 스트리밍은 무제한 타임아웃
                stream=stream  # 스트리밍 모드 활성화
            )

            if response.status_code == 200:
                if stream:
                    return {
                        "success": True,
                        "stream": True,
                        "response": response
                    }
                else:
                    data = response.json()
                    return {
                        "success": True,
                        "stream": False,
                        "message": data.get('message', {}).get('content', '')
                    }
            else:
                return {
                    "success": False,
                    "message": f"채팅 에러: {response.status_code}"
                }
        except Exception as e:
            return {
                "success": False,
                "message": f"채팅 실패: {str(e)}"
            }

    def pull_model(self, model_name: str) -> Dict:
        """모델 다운로드"""
        try:
            response = requests.post(
                f"{self.base_url}/api/pull",
                json={"name": model_name},
                timeout=None  # 다운로드는 무제한 타임아웃
            )

            if response.status_code == 200:
                return {
                    "success": True,
                    "message": f"모델 '{model_name}' 다운로드 완료"
                }
            else:
                return {
                    "success": False,
                    "message": f"다운로드 실패: {response.status_code}"
                }
        except Exception as e:
            return {
                "success": False,
                "message": f"다운로드 에러: {str(e)}"
            }

    def delete_model(self, model_name: str) -> Dict:
        """모델 삭제"""
        try:
            response = requests.delete(
                f"{self.base_url}/api/delete",
                json={"name": model_name},
                timeout=self.timeout
            )

            if response.status_code == 200:
                return {
                    "success": True,
                    "message": f"모델 '{model_name}' 삭제 완료"
                }
            else:
                return {
                    "success": False,
                    "message": f"삭제 실패: {response.status_code}"
                }
        except Exception as e:
            return {
                "success": False,
                "message": f"삭제 에러: {str(e)}"
            }
