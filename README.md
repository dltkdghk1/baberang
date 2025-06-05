# 밥이랑 (Baperang) - AI 기반 스마트 급식 관리 시스템

<div align="center">
  <img src="frontend/public/images/logo/logo.png" alt="밥이랑 로고" width="200"/>
  <p><i>스마트한 급식 관리, 건강한 식생활의 시작</i></p>
</div>

## 프로젝트 소개

***SSAFY 12기 2학기 공통 프로젝트***

⌛ **프로젝트 기간**: 2025.04.14 ~ 2025.05.22 (6주)  
📆 **상세 기간**: 기획 2주 + 개발 3주 + 버그 해결 1주  
🔗 [**노션 링크**](https://www.notion.so/E102-1d5552e551b7807bb018e3807042b637)  
📲 [**배포 URL**](https://k12e102.p.ssafy.io/)  
📝 [**발표 자료**](https://github.com/your-username/project/blob/main/docs/presentation.pdf)

밥이랑(Baperang)은 AI 기술을 활용한 차세대 스마트 급식 관리 시스템입니다. 급식소의 식단 계획, 영양 분석, 식자재 관리, 잔반량 모니터링 등을 자동화하고 최적화하여 효율적인 급식 운영을 지원합니다. 학교, 기업, 병원 등 다양한 단체 급식 환경에 적용할 수 있으며, 맞춤형 영양 관리와 식품 폐기물 감소에 기여합니다.

## 👥 팀 소개
<table style="text-align: center;" width="100%">
  <tr>
    <th style="text-align: center;" width="16.66%"><img src="images/sanghyeok.png" width="150" height="150"/></th>
    <th style="text-align: center;" width="16.66%"><img src="images/jongwha.png" width="150" height="150"/></th>
    <th style="text-align: center;" width="16.66%"><img src="images/gunwook.jpg" width="150" height="150"/></th>
    <th style="text-align: center;" width="16.66%"><img src="images/doyeon.png" width="150" height="150"/></th>
    <th style="text-align: center;" width="16.66%"><img src="images/sanghwa.png" width="150" height="150"/></th>
    <th style="text-align: center;" width="16.66%"><img src="images/minwoo.png" width="150" height="150"/></th>
  </tr>
  <tr>
    <td style="text-align: center;" width="16.66%">이상혁<br/><a href="https://github.com/lsh950523">@lsh950523</a></td>
    <td style="text-align: center;" width="16.66%">이종화<br/><a href="https://github.com/Lee-jonghwa">@Lee-jonghwa</a></td>
    <td style="text-align: center;" width="16.66%">이건욱<br/><a href="https://github.com/MagicMangoSmoothie">@MagicMangoSmoothie</a></td>
    <td style="text-align: center;" width="16.66%">김도연<br/><a href="https://github.com/kdyveliz">@kdyveliz</a></td>
    <td style="text-align: center;" width="16.66%">이상화<br/><a href="https://github.com/dltkdghk1">@dltkdghk1</a></td>
    <td style="text-align: center;" width="16.66%">백민우<br/><a href="https://github.com/minwoo97">@minwoo97</a></td>
  </tr>
  <tr>
    <td style="text-align: center;" width="16.66%">AI 개발</br> (팀장)</td>
    <td style="text-align: center;" width="16.66%">AI 개발</td>
    <td style="text-align: center;" width="16.66%">백엔드 개발</td>
    <td style="text-align: center;" width="16.66%">프론트 개발</td>
    <td style="text-align: center;" width="16.66%">IOT 개발</td>
    <td style="text-align: center;" width="16.66%">인프라 개발</td>
  </tr>
</table>

### 주요 기능

- 🤖 **AI 기반 식단 계획 및 영양 분석**: 영양 균형과 선호도를 고려한 최적 식단 자동 생성
- 📊 **실시간 식수 인원 및 잔반량 모니터링**: AI 이미지 분석을 통한 정확한 잔반량 측정
- 📱 **NFC 기반 학생 식수 관리**: 비접촉식 출입 및 식수 인원 자동 집계
- 📈 **데이터 기반 식자재 소요량 예측**: 식사 인원과 메뉴에 따른 최적 발주량 산출
- 📋 **영양사 맞춤형 식단 관리 도구**: 직관적인 UI로 식단 계획 및 관리 효율화
- 📲 **학생/학부모 피드백 시스템**: 선호도 조사와 영양 정보 제공으로 참여 독려

## 시스템 아키텍쳐

<div align="center">
  <img src="images/System_Architecture.png" alt="시스템 구성도" width="400"/>
</div>

## 기술 스택

### Frontend
- React 19.0.0
- TypeScript 5.7.2
- Vite 6.3.1
- TailwindCSS 3.4.1
- ReCharts.js 4.4.9
- Zustand 5.0.3

### Backend
- Spring Boot 3.4.5
- Java 17
- Spring Security
- Spring Data JPA
- QueryDSL 5.0.0
- MySQL
- JWT

### AI
- Python 3.10+
- PyTorch 2.1+
- FastAPI 0.110+
- MiDaS/DPT (깊이 추정)
- ResNet 
- OpenCV (이미지 처리)
- LangChain 0.0.268+ (식단 추천)

### Hardware
- Python 3.9.13
- Flask
- NFC Reader Integration
- Embedded Linux

## 설치 방법

### 필수 요구사항
- Node.js 18+
- Java 17
- Python 3.10+
- Docker & Docker Compose
- MySQL/PostgreSQL
- NFC Reader (하드웨어 연동 시)

### 설치 단계

1. 저장소 클론
```bash
git clone https://lab.ssafy.com/s12-final/S12P31E102.git
cd S12P31E102
```

2. 환경 설정
```bash
cp .env.example .env
# .env 파일을 편집하여 필요한 환경 변수 설정
```

3. Docker Compose 실행 (권장)
```bash
docker-compose up -d
```

### 수동 설치 (개발용)

1. Frontend 설정
```bash
cd frontend
npm install
npm run dev
```

2. Backend 설정
```bash
cd backend/baperang
./gradlew build
./gradlew bootRun
```

3. AI 서비스 설정
```bash
cd ai
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

4. 하드웨어 설정
```bash
cd hardware
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

## 주요 기능 상세 설명

### 1. AI 기반 식단 관리
- 영양소 균형 자동 계산
- 급식 선호도 기반 메뉴 추천
- NEIS 업무를 위한 Excel 저장

<img src="images/foodmanage.gif" alt="식단 관리" width="400"/>

### 2. 잔반량 모니터링 시스템
- 다중 AI 모델 융합 분석 (역투영, 깊이 추정, ResNet)
- 음식 종류별 잔반량 자동 측정
- 개인/학급/학년별 통계
- 개인화 건강 리포트 생성

<img src="images/report.gif" alt="개인화 레포트 생성" width="400"/>

### 3. NFC 기반 식수 관리
- 학생증/카드 기반 비접촉 체크인
- 실시간 식수 인원 집계

### 4. 식자재 관리 및 발주 시스템
- 식사 인원 기반 소요량 자동 계산
- 식자재 재고 관리 및 알림
- 식재료 이력 추적

<img src="images/manage.gif" alt="재고 관리" width="400"/>

### 5. 데이터 분석 대시보드
- 영양사용 관리 패널
- 메뉴별 실시간 선호도 확인
- 실시간 식사 완료율
- 실시간 잔반률

<img src="images/dashboard.gif" alt="대시보드" width="400"/>

<img src="images/main.gif" alt="메인" width="400"/>

## 프로젝트 구조
```
S12P31E102/
├── frontend/                    # 프론트엔드 (React + TypeScript)
│   ├── src/                    # 소스 코드
│   ├── public/                 # 정적 파일
│   ├── package.json           # 의존성 관리
│   ├── vite.config.ts         # Vite 설정
│   ├── tailwind.config.js     # Tailwind CSS 설정
│   └── Dockerfile             # 프론트엔드 도커 설정
│
├── backend/                    # 백엔드 (Spring Boot)
│   └── baperang/             # 메인 백엔드 프로젝트
│       ├── src/              # 소스 코드
│       └── build.gradle      # Gradle 설정
│
├── ai/                        # AI 서비스 (Python)
│   ├── app/                  # AI 애플리케이션
│   │   ├── api/             # API 엔드포인트
│   │   ├── services/        # 비즈니스 로직
│   │   ├── core/           # 핵심 기능
│   │   └── workflows/      # 워크플로우
│   ├── tests/              # 테스트 코드
│   ├── requirements.txt    # Python 의존성
│   └── Dockerfile         # AI 서비스 도커 설정
│
├── hardware/                 # 하드웨어 연동 (Python)
│   ├── templates/          # 웹 템플릿
│   ├── static/            # 정적 파일
│   ├── app.py            # 메인 애플리케이션
│   └── NFC_write.py      # NFC 관련 기능
│
├── exec/                    # 실행 스크립트
├── .git/                    # Git 저장소
├── .gitlab/                # GitLab 설정
├── .vscode/               # VS Code 설정
├── .idea/                 # IntelliJ 설정
├── menu_output.json      # 메뉴 데이터
├── Readme.md             # 프로젝트 문서
└── .gitignore           # Git 무시 파일 목록
```

## API 명세서

[https://www.notion.so/API-1d5552e551b781dca170dd9e6ca29490](https://www.notion.so/API-1d5552e551b781dca170dd9e6ca29490)


## 문의

- 프로젝트 링크: [https://lab.ssafy.com/s12-final/S12P31E102.git](hhttps://lab.ssafy.com/s12-final/S12P31E102.git)
- 웹사이트: [https://k12e102.p.ssafy.io/](https://k12e102.p.ssafy.io/)

