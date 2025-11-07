#!/usr/bin/env python3
"""
OCR 모델 테스트 스크립트
Ollama OCR 모델(예: richardyoung/olmocr2:7b-q8)을 테스트합니다.
"""

import ollama
import sys
import os
from pathlib import Path


def create_client(host: str = 'http://localhost:11434'):
    """
    Ollama 클라이언트를 생성합니다.

    Args:
        host: Ollama 서버 주소 (예: http://192.168.0.67:11434)

    Returns:
        Ollama 클라이언트
    """
    return ollama.Client(host=host)


def test_ocr(image_path: str, model: str = 'richardyoung/olmocr2:7b-q8', host: str = 'http://localhost:11434'):
    """
    이미지에서 텍스트를 추출합니다.

    Args:
        image_path: 이미지 파일 경로
        model: 사용할 OCR 모델 이름
        host: Ollama 서버 주소

    Returns:
        추출된 텍스트
    """
    # 이미지 파일 존재 확인
    if not os.path.exists(image_path):
        print(f"❌ 에러: 이미지 파일을 찾을 수 없습니다: {image_path}")
        return None

    print(f"📸 이미지: {image_path}")
    print(f"🤖 모델: {model}")
    print(f"🌐 서버: {host}")
    print("-" * 50)

    try:
        print("⏳ Ollama 서버 연결 중...")
        client = create_client(host)

        print("⏳ OCR 처리 중...")
        response = client.chat(
            model=model,
            messages=[{
                'role': 'user',
                'content': 'Extract all text from this image. Return only the extracted text without any explanation.',
                'images': [image_path]
            }]
        )

        extracted_text = response['message']['content']
        print("✅ OCR 완료!\n")
        print("📄 추출된 텍스트:")
        print("-" * 50)
        print(extracted_text)
        print("-" * 50)
        return extracted_text

    except Exception as e:
        print(f"❌ 에러 발생: {e}")
        return None


def test_multiple_images(image_dir: str, model: str = 'richardyoung/olmocr2:7b-q8', host: str = 'http://localhost:11434'):
    """
    디렉토리의 모든 이미지에 대해 OCR을 수행합니다.

    Args:
        image_dir: 이미지가 있는 디렉토리 경로
        model: 사용할 OCR 모델 이름
        host: Ollama 서버 주소
    """
    image_dir = Path(image_dir)

    if not image_dir.exists():
        print(f"❌ 에러: 디렉토리를 찾을 수 없습니다: {image_dir}")
        return

    # 지원하는 이미지 확장자
    image_extensions = {'.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'}
    image_files = [
        f for f in image_dir.iterdir()
        if f.suffix.lower() in image_extensions
    ]

    if not image_files:
        print(f"⚠️  경고: {image_dir}에서 이미지를 찾을 수 없습니다")
        return

    print(f"🖼️  찾은 이미지: {len(image_files)}개\n")

    for i, image_file in enumerate(image_files, 1):
        print(f"\n{'='*50}")
        print(f"[{i}/{len(image_files)}]")
        print(f"{'='*50}")
        test_ocr(str(image_file), model, host)


def main():
    """메인 함수"""
    print("=" * 50)
    print("🚀 Ollama OCR 테스트 도구")
    print("=" * 50)
    print()

    # 명령줄 인자 처리
    if len(sys.argv) < 2:
        print("📖 사용 방법:")
        print("  python test_ocr.py <이미지_경로> [모델_이름] [올라마_주소]")
        print()
        print("📋 예제:")
        print("  # 단일 이미지 테스트 (로컬)")
        print("  python test_ocr.py document.png")
        print()
        print("  # 원격 서버 테스트")
        print("  python test_ocr.py document.png richardyoung/olmocr2:7b-q8 http://192.168.0.67:11434")
        print()
        print("  # 커스텀 모델 사용 (로컬)")
        print("  python test_ocr.py document.png my-ocr-model:latest")
        print()
        print("  # 디렉토리의 모든 이미지 테스트 (원격)")
        print("  python test_ocr.py ./images/ richardyoung/olmocr2:7b-q8 http://192.168.0.67:11434")
        print()
        print("🔗 기본 설정:")
        print("   - 모델: richardyoung/olmocr2:7b-q8")
        print("   - 서버: http://localhost:11434")
        return

    image_path = sys.argv[1]
    model = sys.argv[2] if len(sys.argv) > 2 else 'richardyoung/olmocr2:7b-q8'
    host = sys.argv[3] if len(sys.argv) > 3 else 'http://192.168.0.67:11434'

    # 디렉토리인지 파일인지 확인
    if os.path.isdir(image_path):
        test_multiple_images(image_path, model, host)
    else:
        test_ocr(image_path, model, host)


if __name__ == '__main__':
    main()
