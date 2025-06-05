from typing import Dict, Any
from .llm_service import LLMService
from ..config import settings

class ReportService:
    def __init__(self):
        self.llm_service = LLMService()
    
    async def create_health_report(self, 
                                 bmi: float,
                                 leftover: Dict[str, float],
                                 leftover_most: Dict[str, Any],
                                 leftover_least: Dict[str, Any],
                                 nutrient: Dict[str, Dict[str, Any]]) -> Dict[str, str]:
        """
        학생 식사 정보를 분석하여 건강 리포트를 생성합니다.
        """
        if settings.DEBUG:
            print("[ReportService] 건강 리포트 생성 시작")
            
        # LLM 서비스를 통해 건강 리포트 생성
        report = await self.llm_service.generate_health_report(
            bmi=bmi,
            leftover=leftover,
            leftover_most=leftover_most,
            leftover_least=leftover_least,
            nutrient=nutrient
        )
        
        # 디버깅 출력 추가
        if settings.DEBUG:
            print("[REPORT] 건강 리포트 생성 완료")
            print("[REPORT][DEBUG] 리포트 타입:", type(report))
            print("[REPORT][DEBUG] 리포트 값:", report)
        
        return report