# 식단 통합 로직
import time
from typing import Dict, List, Any
from ..services.menu_service import MenuService
from ..config import settings

class MenuIntegrator:
    """메뉴 통합 로직"""

    def __init__(self, menu_service: MenuService = None):
        """
        통합기 초기화

        Args:
            menu_service: 메뉴 서비스 (선택)
        """
        self.menu_service = menu_service or MenuService()

    async def integrate_plans(self, waste_plan: Dict[str, List[str]], nutrition_plan: Dict[str, List[str]],
                              menu_pool: Dict[str, List[str]]) -> Dict[str, Any]:
        if settings.DEBUG:
            print(f"[INTEGRATOR] Starting integration of {len(waste_plan)} days from waste plan and {len(nutrition_plan)} days from nutrition plan")
            print(f"[INTEGRATOR] Menu pool contains {sum(len(menus) for menus in menu_pool.values())} menus in {len(menu_pool)} categories")
            start_time = time.time()
        """
        잔반 기반 식단과 영양 기반 식단 통합

        Args:
            waste_plan: 잔반율 기반 식단
            nutrition_plan: 영양소 기반 식단
            menu_poll: 사용 가능한 메뉴 풀
        Returns:
            Dict: 통합된 식단과 메트릭
        """
        if settings.DEBUG:
            print(f"[INTEGRATOR] Validating and enriching integrated plan")
        
        # 통합 식단 검증
        validated_plan = await self.menu_service.validate_menu_plan_async(waste_plan, menu_pool)

        if settings.DEBUG:
            validation_duration = time.time() - start_time
            print(f"[INTEGRATOR] Validation completed in {validation_duration:.4f} seconds")
            print(f"[INTEGRATOR] Validated plan has {len(validated_plan)} days")

        # 대체 메뉴 생성
        alternatives = await self.generate_alternatives(validated_plan, menu_pool)

        if settings.DEBUG:
            total_duration = time.time() - start_time
            print(f"[INTEGRATOR] Integration process completed in {total_duration:.4f} seconds")
    
        return {
            "integrated_plan": validated_plan,
            "alternatives": alternatives,
        }
    
    async def generate_alternatives(self, plan: Dict[str, List[str]], menu_data: Dict[str, Any]) -> Dict[str, Dict[str, List[str]]]:
        """
        날짜별 대체 메뉴 생성

        Args:
            plan: 통합 식단
            menu_data: 메뉴 풀
        
        Retruns:
            Dict: 날짜별 대체 메뉴
        """
        # 메뉴 서비스에 위임
        if self.menu_service:
            return await self.menu_service.generate_alternatives_async(plan, menu_data)

        # 간단한 대체 구현(메뉴 서비스 없는 경우)
        alternatvies = {}

        # 카테고리별 메뉴 추출
        categorized_menus = menu_data.get("categorized_menus", {})

        for date, menus in plan.items():
            date_alternatives = {}

            for menu in menus:
                # 메뉴 카테고리 추정
                found_category=None
                for category, category_menus in categorized_menus.items():
                    if menu in category_menus:
                        found_category = category
                        break
                

                # 같은 카테고리에서 대체 메뉴 선택
                alt_menus=[]
                if found_category and found_category in categorized_menus:
                    # 같은 카테고리의 다른 메뉴들
                    same_category_menus = [m for m in categorized_menus[found_category] if m != menu]

                    # 최대 3개 선택
                    alt_menus = same_category_menus[:3]
                # 대체 메뉴 저장
                date_alternatives[menu] = alt_menus

            alternatvies[date] = date_alternatives
        
        return alternatvies