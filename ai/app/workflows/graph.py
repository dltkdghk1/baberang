# LangGraph 워크플로우 정의 (식단 에이전트)
import asyncio
import time, json

from typing import Dict, Any

from .agents import WastePlanAgent, NutritionPlanAgent, IntegrationAgent
from ..config import settings

class MenuPlanningWorkflow:
    """식단 계획 워크플로우"""

    def __init__(self):
        """워크플로우 초기화"""
        self.waste_agent = WastePlanAgent()
        self.nutrition_agent = NutritionPlanAgent()
        self.integration_agent = IntegrationAgent()
    
    async def run_workflow(self, init_state: Dict[str, Any], holidays: Dict[str, Any]) -> Dict[str, Any]:
        """
        워크플로우 실행

        Args:
            init_state: 초기 상태
        Returns:
            Dict: 최종 결과
        """
        # 디버그 로그
        if settings.DEBUG:
            print(f"[WORKFLOW] Starting workflow with input state keys: {', '.join(init_state.keys())}")
            start_time = time.time()
            if "menu_pool" in init_state:
                total_menus = sum(len(menus) for menus in init_state["menu_pool"].values())
                print(f"[WORKFLOW] Menu pool contains {total_menus} menus in {len(init_state['menu_pool'])} categories")
        
        # 1. 병렬로 잔반율 기반 식단과 영양소 기반 식단 생성
        waste_task = asyncio.create_task(self.waste_agent.process(init_state, holidays))
        nutrition_task = asyncio.create_task(self.nutrition_agent.process(init_state, holidays))
        waste_task = asyncio.create_task(self.waste_agent.process(init_state, holidays))
        nutrition_task = asyncio.create_task(self.nutrition_agent.process(init_state, holidays))

        if settings.DEBUG:
            print(f"[WORKFLOW] Starting parallel execution of waste and nutrition agents")
            waste_start_time = time.time()

        # 병렬 실행 대기
        waste_result, nutrition_result = await asyncio.gather(waste_task, nutrition_task)

        # 결과 출력 (디버깅용)
        if settings.DEBUG:
            print("\n=== WASTE PLAN RESULT ===")
            print(json.dumps(waste_result, ensure_ascii=False, indent=2))
            print("\n=== NUTRITION PLAN RESULT ===")
            print(json.dumps(nutrition_result, ensure_ascii=False, indent=2))

        if settings.DEBUG:
            waste_duration = time.time() - waste_start_time
            print(f"[WORKFLOW] Parallel execution completed in {waste_duration:.4f} seconds")
            if "waste_plan" in waste_result:
                print(f"[WORKFLOW] Waste agent generated plan with {len(waste_result['waste_plan'])} days")
            if "nutrition_plan" in nutrition_result:
                print(f"[WORKFLOW] Nutrition agent generated plan with {len(nutrition_result['nutrition_plan'])} days")

        # 2. 상태 업데이터
        state = {**init_state, **waste_result, **nutrition_result}

        # 디버그 로그
        if settings.DEBUG:
            print(f"[WORKFLOW] Intermediate state after agents : {state.keys()}")
        
        # 3. 통합 에이전트 실행
        final_result = await self.integration_agent.process(state, holidays)
        
        if settings.DEBUG:
            print(f"final_reuslt: {final_result}")

        # 4. 최종 상태 업데이트
        state.update(final_result)

        # 디버그 로그
        if settings.DEBUG:
            total_duration = time.time() - start_time
            print(f"[WORKFLOW] Workflow completed in {total_duration:.4f} seconds")
            print(f"[WORKFLOW] Final state has {len(state)} keys")
            
        return state