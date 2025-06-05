# FAST API 진입점, router 등록
from fastapi import FastAPI, Depends
import uvicorn
import datetime
from .config import settings
from .api.routes import router
from .services.analyze_service import AnalyzeService

if settings.DEBUG:
    print(f"[MAIN] Initailizing {settings.API_TITLE} v{settings.API_VERSION}")

app = FastAPI(
    title=settings.API_TITLE,
    version=settings.API_VERSION
)

# 서버 시작 시 모델 로드
@app.on_event("startup")
async def startup_event():
    if settings.DEBUG:
        print("[MAIN] Loading models on startup...")
    app.state.analyze_service = AnalyzeService()
    if settings.DEBUG:
        print("[MAIN] Models loaded successfully")

# AnalyzeService 의존성 주입
def get_analyze_service() -> AnalyzeService:
    return app.state.analyze_service

# 라우터에 의존성 주입
app.include_router(router, dependencies=[Depends(get_analyze_service)])

# 상태 확인 엔드포인트
@app.get("/health")
async def health_check():
    """애플리케이션 상태 확인 엔드포인트"""
    if settings.DEBUG:
        print(f"[HEALTH] Health check called at {datetime.datetime.now()}")
    return {"status": "healty", "version": settings.API_VERSION}

# 메인 실행함수
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001, reload=settings.DEBUG, log_level="debug" if settings.DEBUG else "info")