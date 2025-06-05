from fastapi import APIRouter, HTTPException, Depends
from ..config import settings
import time
from fastapi import Request

from .models import (
    PlanRequest,
    PlanResponse,
    AnalyzeRequest,           
    AnalyzeResponse,
    ReportRequest,
    ReportResponse
)

from ..services.menu_service import MenuService
from ..services.analyze_service import AnalyzeService
from ..workflows.graph import MenuPlanningWorkflow
from ..services.report_service import ReportService

router = APIRouter(prefix="/ai")


# 서비스 의존성
def get_menu_service():
    return MenuService()

def get_analyze_service(request: Request) -> AnalyzeService:
    return request.app.state.analyze_service

def get_workflow_service():
    return MenuPlanningWorkflow()

def get_report_service():
    return ReportService()


@router.post("/analyze-leftover", response_model=AnalyzeResponse)
async def analyze_leftover_endpoint(
    request: AnalyzeRequest,
    analyze_service: AnalyzeService = Depends(get_analyze_service)
):
    """
    잔반 이미지 분석 엔드포인트

    식전/식후 이미지를 비교하여 메뉴별 잔반율을 반환

    POST /ai/analyze-leftover
    {
      "before_images": {
        "side_1": "https://e102.s3.ap-northeast-2.amazonaws.com/이상화_식전_side_1.jpg",
        ...
      },
      "after_images": {
        "side_1": "https://e102.s3.ap-northeast-2.amazonaws.com/이상화_식후_side_1.jpg",
        ...
      },
      "student_info": {
        "id": 1,
        "name": "이상화",
        "grade": 2,
        "class": 6,
        "number": 17
      }
    }
    → {
      "leftover_rate": {
        "side_1": 2.3,
        ...
      },
      "student_info": {
        "id": 1,
        "name": "이상화",
        "grade": 2,
        "class": 6,
        "number": 17
      }
    }
    """
    try:
        result = await analyze_service.analyze_leftover_images(
            before_images=request.beforeImages,
            after_images=request.afterImages,
            student_info=request.studentInfo.model_dump(by_alias=True)
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"이미지 분석 중 오류: {str(e)}")

@router.post("/menu-plan", response_model=PlanResponse)
async def generate_menu_plan(
    request: PlanRequest,
    menu_service: MenuService = Depends(get_menu_service),
    workflow: MenuPlanningWorkflow = Depends(get_workflow_service)
):
    if settings.DEBUG:
        print(f"[ROUTE][generate_menu_plan] Request Received with {len(request.menuData)} menu data items")
        if request.menuPool:
            print(f"[ROUTE][generate_menu_plan] Menu Pool provided with {len(request.menuPool)} items")
        start_time = time.time()
    """
    통합 식단 계획 생성 엔드포인트
    
    선호도와 잔반율, 영양 데이터 기반으로 식단 셍성
    """
    try:
        menu_data = request.menuData
        menu_pool = request.menuPool
        holidays = request.holidays
        holidays = request.holidays

        if settings.DEBUG:
            print(f"[ROUTE][generate_menu_plan] Preparing data for LLM")

        # 메뉴 데이터 추출 및 LLM 입력용으로 변환(토큰 절약)
        processed_data = menu_service.prepare_for_llm(menu_data, menu_pool)

        if settings.DEBUG:
            print(f"[ROUTE][generate_menu_plan] Data prepared, running workflow")

        # 워크 플로우 실행
        if settings.DEBUG:
            print(f"[ROUTE][generate_menu_plan] Before awaiting workflow")
        result = await workflow.run_workflow(processed_data, holidays)

        if settings.DEBUG:
            print("[ROUTE][generate_menu_plan] After awaiting workflow, result : ", result)
            print("[ROUTE][generate_menu_plan] working flow process time :", time.time() - start_time)

        
        integrated_plan = result["integrated_plan"]

        # 1. 날짜별 메뉴 리스트 형태로 변환
        plan_for_alternatives = {}
        for date, menu_categories in integrated_plan.items():
            plan_for_alternatives[date] = list(menu_categories.keys())
        
        # 2. 메뉴 메타데이터 준비
        menu_metadata = {
            "categorized_menus": processed_data["menu_pool"],
            "menu_preference": processed_data.get("preference_data", {}).get("average_rating", {}),
            "menu_leftover": processed_data.get("leftover_data", {})
        }
        
        # 3. 대체 메뉴 생성 (선호도 기반)
        alternatives_data = await menu_service.generate_alternatives_async(
            plan_for_alternatives, 
            menu_metadata
        )
        
        # 4. 결과 포맷팅
        menu_based_plan = {}
        for date, menu_categories in integrated_plan.items():
            menu_map = {}
            for menu_name, category in menu_categories.items():
                # 대체 메뉴 가져오기 (없으면 빈 리스트)
                alternative_menus = alternatives_data.get(date, {}).get(menu_name, [])                
                menu_map[menu_name] = {
                    "category": category,
                    "alternatives": alternative_menus
                }
            menu_based_plan[date] = menu_map

        if settings.DEBUG:
            print("menu_based_plan : ", menu_based_plan)

        return PlanResponse(
            plan=menu_based_plan
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"식단 생성 중 오류: {str(e)}")


@router.post("/health-report", response_model=ReportResponse)
async def create_health_report(
    request: ReportRequest,
    report_service:ReportService = Depends(get_report_service)
):
    if settings.DEBUG:
        print("[ROUTE][create_health_report] start create report")
        print(f"요청 데이터: {request}")
    try:
        report = await report_service.create_health_report(
            bmi=request.bmi,
            leftover=request.leftover,
            leftover_most=request.leftoverMost,
            leftover_least=request.leftoverLeast,
            nutrient=request.nutrient
        )
        if settings.DEBUG:
            print("생성결과 : ",report)
        # 리포트 응답 반환
        return ReportResponse(
            analyzeReport=report["analyzeReport"],
            plan=report["plan"],
            opinion=report["opinion"]
        )
    except Exception as e:
        error_msg = f"리포트 생성 중 오류: {str(e)}"
        if settings.DEBUG:
            print(f"[ERROR] {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)