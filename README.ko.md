# Local LLM WebUI

[🇪🇸 English](README.md) | [🇰🇷 한국어](README.ko.md)

Ollama와 연동되는 모던한 웹 기반 LLM 인터페이스입니다. 로컬 머신에서 대형 언어 모델을 쉽게 사용할 수 있도록 설계되었습니다.

## ✨ 주요 기능

- **💬 실시간 스트리밍 채팅** - Ollama 모델과의 실시간 대화 지원
- **🔐 사용자 인증** - SQLite 기반 회원가입/로그인 (bcrypt 비밀번호 해싱)
- **💾 대화 이력 관리** - 대화 저장, 불러오기, 제목 수정, 삭제 (소프트 삭제)
- **📊 메시지 저장** - 모든 메시지, 이미지, 메트릭 정보 데이터베이스 저장
- **🤖 모델별 추적** - 한 대화에서 여러 모델 사용 가능, 각 응답의 모델명 기록
- **⚡ 성능 메트릭** - 토큰 속도, 생성 시간, 프롬프트 처리 시간, 모델 로드 시간
- **📦 모델 관리** - 모델 설치, 삭제, 다운로드
- **🖼️ 이미지 업로드** - 메시지와 함께 이미지 전송 (드래그 앤 드롭 지원)
- **📝 마크다운 렌더링** - AI 응답을 마크다운으로 표시
- **💻 코드 하이라이팅** - 코드 블록에 구문 강조
- **📱 반응형 디자인** - 데스크톱 및 모바일 완벽 지원
- **🎨 모던 UI** - Tailwind CSS 기반 세련된 다크 테마

## 📋 시스템 요구사항

- Python 3.8+
- Ollama (설치: https://ollama.ai)
- 최소 4GB RAM (권장: 8GB 이상)

## 🚀 설치

### 1. 저장소 클론
```bash
git clone <repository-url>
cd local-llm-webui
```

### 2. Python 의존성 설치
```bash
pip install -r requirements.txt
```

### 3. 환경 설정
`.env` 파일 수정 (필수):
```env
# Ollama 서버 주소
OLLAMA_API_URL=http://localhost:11434

# Flask 설정
FLASK_DEBUG=True
SECRET_KEY=your-secret-key-here

# 서버 포트
SERVER_PORT=5001

# SQLite 설정
DATABASE_PATH=./app.db
```

### 4. 서버 실행
```bash
python main.py
```

서버가 시작되면 브라우저에서 다음 주소로 접속:
```
http://localhost:5001
```

## 💡 사용 방법

### 첫 실행
1. 로그인 페이지에서 "가입하기"를 클릭
2. 새로운 계정 생성 (사용자명, 비밀번호)
3. 로그인

### 채팅 사용
1. 페이지 상단에서 모델 선택
2. 메시지 입력 후 **Enter** 키 또는 전송 버튼 클릭
3. **Shift + Enter** - 메시지 창에서 줄바꿈

### 이미지 업로드
- 🖼️ 버튼 클릭하여 이미지 선택
- 또는 메시지 창에 드래그 앤 드롭
- 또는 Ctrl+V로 클립보드 이미지 붙여넣기

### 모델 관리
1. 우측 상단 "⚙️ 모델 관리" 버튼 클릭
2. **설치된 모델** - 현재 설치된 모델 확인 및 삭제
3. **모델 다운로드** - 새로운 모델 설치 (예: llama2, mistral, neural-chat)

### 대화 이력
1. 좌측 사이드바 "새 대화" 버튼으로 새 대화 생성
2. 기존 대화 클릭하여 불러오기
3. 대화 제목 수정 및 삭제 가능
4. **같은 대화에서 여러 모델 사용 가능** - 모델을 바꾸면 자동으로 마지막 사용 모델이 저장됨

### 성능 정보
- 각 AI 응답 아래에 다음 정보 표시:
  - 🤖 **사용 모델** - 해당 응답을 생성한 모델명
  - ⚡ **토큰 속도** - 초당 생성된 토큰 수
  - ⏱️ **생성 시간** - 응답 생성에 소요된 시간
  - 📥 **프롬프트 처리** - 프롬프트 분석 시간
  - 📦 **모델 로드** - 모델 로딩에 소요된 시간

## 📁 프로젝트 구조

```
local-llm-webui/
├── main.py                 # Flask 애플리케이션 진입점
├── config.py              # 설정 파일
├── models.py              # SQLAlchemy User 모델
├── requirements.txt       # Python 의존성
├── .env                   # 환경 변수 설정
├── app.db                 # SQLite 데이터베이스 (자동 생성)
├── routes/
│   ├── api.py            # 채팅/모델 관리 API
│   └── auth.py           # 인증 API (로그인/로그아웃)
├── utils/
│   ├── ollama_client.py  # Ollama API 클라이언트
│   └── decorators.py     # 로그인 필수 데코레이터
├── templates/
│   ├── index.html        # 채팅 페이지
│   └── login.html        # 로그인 페이지
└── static/
    ├── css/
    │   └── style.css     # (Tailwind CSS로 대체됨)
    └── js/
        └── app.js        # 프론트엔드 로직
```

## 🔧 API 엔드포인트

### 인증
- `POST /api/auth/login` - 로그인
- `POST /api/auth/logout` - 로그아웃 (로그인 필수)
- `GET /api/auth/check` - 로그인 상태 확인
- `POST /api/auth/register` - 회원가입

### 채팅 & 모델
- `GET /api/health` - Ollama 서버 상태 확인 (로그인 필수)
- `GET /api/models` - 모델 목록 조회 (로그인 필수)
- `POST /api/chat` - 채팅 (스트리밍, 로그인 필수)
- `POST /api/save-message` - AI 응답 메시지 저장 (로그인 필수)
- `POST /api/pull` - 모델 다운로드 (로그인 필수)
- `POST /api/delete` - 모델 삭제 (로그인 필수)

### 대화 이력
- `GET /api/conversations` - 사용자의 모든 대화 목록 조회 (로그인 필수)
- `POST /api/conversations` - 새 대화 생성 (로그인 필수)
- `GET /api/conversations/{id}` - 특정 대화와 메시지 조회 (로그인 필수)
- `PUT /api/conversations/{id}/title` - 대화 제목 수정 (로그인 필수)
- `DELETE /api/conversations/{id}` - 대화 삭제 (소프트 삭제, 로그인 필수)

## ⚙️ 설정 옵션

### .env 파일 설명

| 변수 | 설명 | 기본값 |
|------|------|--------|
| OLLAMA_API_URL | Ollama 서버 주소 | http://localhost:11434 |
| FLASK_DEBUG | Flask Debug 모드 | True |
| SECRET_KEY | Flask 세션 암호화 키 | dev-secret-key |
| SERVER_PORT | 웹 서버 포트 | 5001 |
| DATABASE_PATH | SQLite DB 경로 | ./app.db |

## 🔒 보안

- **비밀번호**: bcrypt로 해싱되어 안전하게 저장
- **세션**: Flask 세션으로 로그인 상태 관리
- **XSS 방지**: DOMPurify로 사용자 입력 검증
- **CSRF**: 기본 Flask CSRF 보호

> ⚠️ **주의**: 개발 환경용입니다. 프로덕션 배포 시 추가 보안 조치가 필요합니다.

## 🐛 트러블슈팅

### Ollama 연결 실패
```
에러: "Ollama 서버에 연결할 수 없습니다"
해결:
1. Ollama 서버가 실행 중인지 확인
2. OLLAMA_API_URL이 정확한지 확인
3. 방화벽 설정 확인
```

### 모델 다운로드 실패
```
에러: "다운로드 실패"
해결:
1. 인터넷 연결 확인
2. Ollama 모델 이름 확인 (https://ollama.ai/library)
3. 디스크 공간 확인
```

### 데이터베이스 초기화
```bash
rm app.db
python main.py  # 새 데이터베이스 자동 생성
```

## 🎨 UI 기술 스택

- **HTML5** - 구조
- **Tailwind CSS** - 스타일 (CDN)
- **JavaScript** - 상호작용
- **Marked.js** - 마크다운 파싱
- **Highlight.js** - 코드 하이라이팅
- **DOMPurify** - XSS 방지

## 🛠️ 개발 모드

이미 활성화된 기능:
- ✅ Debug 모드 (`debug=True`)
- ✅ Auto-reload (파일 변경 시 자동 재시작)
- ✅ 상세한 에러 메시지

Python 파일 수정 후 자동으로 서버가 재시작됩니다.

## 📝 변경 로그

### v1.1.0
- **대화 이력 관리** - 대화 저장, 불러오기, 제목 수정, 삭제 기능
- **메시지 저장** - 모든 메시지, 이미지, 메트릭 정보를 데이터베이스에 저장
- **모델별 추적** - 각 AI 응답의 사용 모델명 기록 및 표시
- **성능 메트릭** - 토큰 속도, 생성 시간, 프롬프트 처리 시간, 모델 로드 시간 표시
- **삭제 버튼 개선** - 그라디언트 스타일의 이쁜 삭제 버튼
- **UI/UX 개선** - 메트릭 정보 섹션에 모델명 통합 표시

### v1.0.0
- Tailwind CSS로 UI 리디자인
- 로그인/인증 시스템 추가
- 스트리밍 채팅 구현
- 모바일 반응형 지원

## 📄 라이선스

MIT License

## 🤝 기여

버그 리포트나 기능 제안은 이슈를 통해 등록해주세요.

## ❓ FAQ

**Q: 모델을 어떻게 설치하나요?**
A: 모델 관리 → 모델 다운로드에서 모델명을 입력하면 자동 설치됩니다. (예: llama2, mistral)

**Q: 다중 사용자를 지원하나요?**
A: 네, 각 사용자는 독립적인 계정으로 로그인할 수 있습니다. 각 사용자의 대화 이력과 메시지는 별도로 관리됩니다.

**Q: 한 대화에서 여러 모델을 사용할 수 있나요?**
A: 네! 같은 대화에서 모델을 바꿔가며 대화할 수 있습니다. 각 AI 응답에 어떤 모델을 사용했는지 자동으로 기록됩니다.

**Q: 이전 대화를 다시 볼 수 있나요?**
A: 네, 좌측 사이드바의 대화 목록에서 이전 대화를 선택하면 전체 메시지 이력을 볼 수 있습니다. 대화는 날짜별로 자동 정렬됩니다.

**Q: 성능 정보는 어디서 볼 수 있나요?**
A: 각 AI 응답 아래에 성능 정보가 표시됩니다. (토큰 속도, 생성 시간, 프롬프트 처리 시간, 모델 로드 시간)

**Q: 원격 서버에 배포할 수 있나요?**
A: 가능하지만 프로덕션 설정이 필요합니다. `SECRET_KEY` 변경, HTTPS 설정 등을 권장합니다.

**Q: 어떤 모델을 추천하나요?**
A: 입문용: llama2, mistral / 고급용: neural-chat, orca-mini, gpt-oss

---

**작성일**: 2025년 11월
**버전**: 1.1.0
