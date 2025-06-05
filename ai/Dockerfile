# ai/Dockerfile

# 1) Python 베이스 이미지
FROM python:3.10.11-slim

# 2) 작업 디렉토리
WORKDIR /app

# OpenCV가 필요로 하는 시스템 라이브러리
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgl1 \
  && rm -rf /var/lib/apt/lists/*

# 3) 의존성 복사 및 설치 (context: ai/)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4) 실제 애플리케이션 복사 (context: ai/app → 컨테이너 /app/)
COPY app/ ./app

# 5) 모델 캐시 디렉토리 생성
RUN mkdir -p /app/model_cache

# 6) MiDaS 모델 미리 다운로드
RUN python -c "import torch; torch.hub.load('intel-isl/MiDaS', 'DPT_Large', trust_repo=True)"


# 7) 엔트리포인트 설정
EXPOSE 8001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
