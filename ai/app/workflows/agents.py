from typing import Dict, Any
import time

from ..services.llm_service import LLMService, waste_plan_fn, nutrition_plan_fn, integration_plan_fn
from ..core.prompts import PromptTemplates
from ..config import settings

class WastePlanAgent:
    """잔반율 기반 식단 생성 에이전트"""  
    
    def __init__(self):
        """에이전트 초기화"""
        self.llm_service = LLMService()

    async def process(self, state: Dict[str, Any], holidays: Dict[str, Any]) -> Dict[str, Any]:
        """
        상태를 처리하여 잔반율 기반 식단 생성
        
        Args:
            state: 현재 상태
        Returns:
            Dict: 처리 결과
        """
        start_time = time.time()
        leftover_data = state.get("leftover_data", {})
        menu_pool = state.get("menu_pool", [])
        if settings.DEBUG:
            print(f"[AGENT][WastePlanAgent] Extracted data:")
            print(f"  - Leftover data: {len(leftover_data)} items")
            print(f"  - Menu pool: {len(menu_pool)} items")
            print(f"[AGENT][WastePlanAgent] Generating prompt")

        # 프롬프트 생성
        prompt = PromptTemplates.waste_based_templates(
            leftover_data=leftover_data,
            menu_pool=menu_pool,
            holidays=holidays
        )

        if settings.DEBUG:
            print(f"[AGENT][WastePlanAgent] Calling LLM with prompt of length {len(prompt)}")
        
        # LLM 호출
        waste_plan = await self.llm_service.generate_structured_response(prompt, function_def=waste_plan_fn)

        if settings.DEBUG:
            print(f"[AGENT][WastePlanAgent] Received waste plan with {len(waste_plan)} days")
            print(f"[AGENT][WastePlanAgent] Processing time: {time.time() - start_time:.4f} seconds")

        # 결과 반환
        return {"waste_plan": waste_plan}
    
class NutritionPlanAgent:
    """영양소 기반 식단 생성 에이전트"""

    def __init__(self):
        """에이전트 초기화"""
        self.llm_service = LLMService()

    async def process(self, state: Dict[str, Any], holidays: Dict[str, Any]) -> Dict[str, Any]:
        """
        상태를 처리하여 영양소 기반 식단 생성

        Args:
            state: 현재 상태
        Returns:
            Dict: 처리 결과
        """
        # 필요한 데이터 추출
        preference_data = state.get("preference_data", {})
        menu_pool = state.get("menu_pool", {})

        # 프롬프트 생성
        prompt = PromptTemplates.nutrition_based_template(
            preference_data=preference_data,
            menu_pool=menu_pool,
            holidays=holidays
        )

        # LLM 호출
        nutrition_plan = await self.llm_service.generate_structured_response(prompt, function_def=nutrition_plan_fn)
        
        # 결과 반환
        return {"nutrition_plan" : nutrition_plan}
    
class IntegrationAgent:
    """식단 통합 에이전트"""

    def __init__(self):
        """에이전트 초기화"""
        self.llm_service = LLMService()

    async def process(self, state: Dict[str, Any], holidays: Dict[str, Any]) -> Dict[str, Any]:
        """
        잔반율 식단과 영양소 기반 식단을 통합
        Args:
            state: 현재 상태
        Returns:
            Dict: 처리 결과
        """
        # 필요한 데이터 추출
        waste_plan = state.get("waste_plan", {})
        nutrition_plan = state.get("nutrition_plan", {})

        # 프롬프트 생성
        prompt = PromptTemplates.integration_template(
            waste_plan=waste_plan,
            nutrition_plan=nutrition_plan,
            holidays=holidays
        )

        # LLM 호출
        integrated_plan = await self.llm_service.generate_structured_response(prompt, function_def=integration_plan_fn)

        # 결과 반환
        return {
            "integrated_plan": integrated_plan
        }