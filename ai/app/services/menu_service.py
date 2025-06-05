from typing import Dict, List, Any, Optional
import time
import random
from ..config import settings
from collections import defaultdict
import statistics
import asyncio

class MenuService:
    """메뉴 관리 서비스"""

    def __init__(self):
        """메뉴 서비스 초기화"""
        pass
    
    def extract_menu_data(self, menu_data: Dict[str, Dict[str, Dict[str, Dict[str, Any]]]], menu_pool: Dict[str, str]) -> Dict[str, Any]:
        if settings.DEBUG:
            print(f"[MENU][extract_menu_data] Extracting menu data from {len(menu_data)} days of data")
            start_time = time.time()

        if settings.DEBUG:
            menu_count = len(menu_pool) if menu_pool else 0
            print(f"[MENU][extract_menu_data] Organizing {menu_count} menus by category")
        
        """
        Spring에서 받은 날짜별 메뉴 데이터에서 유용한 정보 추출

        Args:
            menu_data: {날짜: {메뉴명: {잔반율, 선호도, 영양소:{kcal, fat, ...}}}}
            menu_pool: {메뉴명: 카테고리}
        Returns:
            Dict: 추출된 메뉴 데이터        
        """

        # 결과 저장용 구조
        menu_nutrition = {}
        menu_preference = {}
        menu_leftover = {}

        # 카테고리별 메뉴 그룹핑
        categorized_menus = defaultdict(list)
        for menu_name, category in menu_pool.items():
            categorized_menus[category].append(menu_name)

        # 메뉴별 통계 수집 (여러 날짜에 걸친 값들)
        preference_stats = defaultdict(list)
        leftover_stats = defaultdict(list)

        nutrition_keys = set()

        # 날짜별 데이터 순회
        for date, daily_menus in menu_data.items():
            # 일별 메뉴 순회
            for menu_name, menu_info in daily_menus.items():
                # 영양소 정보 수집
                if "nutrition" in menu_info and isinstance(menu_info["nutrition"], dict):
                    # 아직 이 메뉴의 영양소 정보가 없으면 세 딕셔너리 생성
                    if menu_name not in menu_nutrition:
                        menu_nutrition[menu_name] = {}

                    # 모든 영양소 키-값 쌍 추출
                    for nutrient_key, nutrient_value in menu_info["nutrition"].items():
                        # 영양소 키 집합에 추가
                        nutrition_keys.add(nutrient_key)
                        
                        # 메뉴의 영양소 정보 업데이트
                        menu_nutrition[menu_name][nutrient_key] = nutrient_value
                
                # 선호도 통계 수집
                if "preference" in menu_info:
                    preference_stats[menu_name].append(menu_info['preference'])
                
                # 잔반율 통계 수집
                if "leftover" in menu_info:
                    leftover_stats[menu_name].append(menu_info["leftover"])
        
        if settings.DEBUG:
            print(f"[MENU][extract_menu_data] Collected data for {len(menu_nutrition)} menus with nutrition info")
            print(f"[MENU][extract_menu_data] Found {len(nutrition_keys)} unique nutrition keys")
            print(f"[MENU][extract_menu_data] Calculating average preferences and leftover rates")

        # 메뉴별 평균 선호도 계산
        for menu_name, values in preference_stats.items():
            # 기본값 3.0
            menu_preference[menu_name] = statistics.mean(values) if values else 3.0

        # 메뉴별 평균 잔반율 계산
        for menu_name, values in leftover_stats.items():
            # 기본값 0.2
            menu_leftover[menu_name] = statistics.mean(values) if values else 0.2

        if settings.DEBUG:
            print(f"[MENU][extract_menu_data] Extraction completed with:")
            print(f"  - {len(categorized_menus)} categories")
            print(f"  - {len(menu_nutrition)} menus with nutrition data")
            print(f"  - {len(menu_preference)} menus with preference data")
            print(f"  - {len(menu_leftover)} menus with leftover data")
            print(f"[MENU][extract_menu_data] Processing time: {time.time() - start_time:.4f} seconds")
    
        # 결과 반환
        return {
            "categorized_menus": dict(categorized_menus),
            "menu_nutrition": menu_nutrition,
            "menu_preference": menu_preference,
            "menu_leftover": menu_leftover,
            "nutrition_keys": list(nutrition_keys)
        }

    def prepare_for_llm(self, menu_data: Dict[str, Dict[str, Dict[str,Dict[str,Any]]]], menu_pool: Dict[str, str]) -> Dict[str, Any]:
        """
        LLM 요청을 위한 데이터 준비 (토큰 최적화)

        Args:
            menu_data : {날짜: {메뉴명: {잔반율, 선호도, 영양소: {}}}}
            menu_pool : {메뉴명: 카테고리}

        Returns:
            Dict: LLM 입력용 최적화된 데이터
        """
        if settings.DEBUG:
            print(f"[MENU][prepare_for_llm] Input menu_data keys: {menu_data.keys()}")
            print(f"[MENU][prepare_for_llm] Input menu_pool size: {len(menu_pool)}")

        extracted_data = self.extract_menu_data(menu_data, menu_pool)

        categorized_menu = extracted_data["categorized_menus"]

        categorized_preference = {}
        for category, menus in categorized_menu.items():
            category_prefs = {}
            for menu in menus:
                if menu in extracted_data["menu_preference"]:
                    category_prefs[menu] = extracted_data["menu_preference"][menu]

            if category_prefs:
                sorted_items = sorted(category_prefs.items(), key=lambda x: x[1], reverse=True)
                top_items = sorted_items[:80]
                categorized_preference[category] = dict(top_items)

        categorized_leftover = {}
        for category, menus in categorized_menu.items():
            category_leftover = {}
            try:
                for menu in menus:
                    if "menu_leftover" in extracted_data and menu in extracted_data["menu_leftover"]:
                        category_leftover[menu] = extracted_data["menu_leftover"][menu]
            except Exception as e:
                if settings.DEBUG:
                    print(f"[MENU][prepare_for_llm] Error accessing menu_leftover: {str(e)}")
                    print(f"[MENU][prepare_for_llm] extracted_data structure: {extracted_data.keys()}")
            
            if category_leftover:
                sorted_items = sorted(category_leftover.items(), key=lambda x: x[1], reverse=True)
                top_items = sorted_items[:80]
                categorized_leftover[category] = dict(top_items)

        optimized_menu_pool = {}
        for category, menus in categorized_menu.items():
            optimized_menu_pool[category] = menus[:35] if len(menus) > 40 else menus
        
        # 영양소 정보 구성
        priority_nutrients = ['kcal', 'protein', 'fat', 'carbo']
        nutrition_info = {}

        # 발견된 영양소 키 중 우선순위가 있는 것 먼저 포함, 나머지는 선택적 포함
        try:
            # 발견된 영양소 키 중 우선순위가 있는 것 먼저 포함, 나머지는 선택적 포함
            available_keys = set(extracted_data.get("nutrition_keys", []))
            if settings.DEBUG:
                print(f"[MENU][prepare_for_llm] Available nutrition keys: {available_keys}")
        except Exception as e:
            if settings.DEBUG:
                print(f"[MENU][prepare_for_llm] Error processing nutrition keys: {str(e)}")
            # 오류 발생 시 기본값 사용
            available_keys = set()
        selected_keys = [k for k in priority_nutrients if k in available_keys]

        # 추가 영양소 키
        remaining_keys = [k for k in available_keys if k not in priority_nutrients]
        if remaining_keys:
            selected_keys.extend(remaining_keys[:3])

        # 메뉴별 영양소 정보 구성
        for menu, nutrients in extracted_data["menu_nutrition"].items():
            nutrition_info[menu] = {k: nutrients.get(k) for k in selected_keys if k in nutrients}
        
        # LLM 입력용 최적화 데이터
        return {
            "menu_pool": optimized_menu_pool,
            "preference_data": {"average_rating": categorized_preference},
            "leftover_data": categorized_leftover,
            "nutrition_data": nutrition_info,
            "nutrition_keys": selected_keys  # 선택된 영양소 키
        }
    
    def validate_menu_plan(self, plan: Dict[str, List[str]], menu_pool_by_category: Dict[str, List[str]]) -> Dict[str, List[str]]:
        """
        LLM이 생성한 식단 계획 검증 및 수정

        Args:
            plan: 생성된 식단 계획
            menu_pool_by_category: 카테고리 별 메뉴 풀
        
        Returns:
            Dict: 검증 및 수정된 식단 계획
        """
        # 전체 메뉴 풀 생성
        all_menus = []
        for menus in menu_pool_by_category.values():
            all_menus.extend(menus)
          
        validated_plan = {}

        # 각 날짜별 식단 검증
        for date, menus in plan.items():
            valid_menus = []

            # 메뉴가 실제 메뉴 풀에 있는지 확인
            for menu in menus:
                if menu in all_menus:
                    valid_menus.append(menu)
                else:
                    # 유사한 메뉴 찾기
                    similar_menu = self._find_similar_menu(menu, all_menus)
                    if similar_menu:
                        valid_menus.append(similar_menu)
            
            # 검증된 메뉴 저장
            validated_plan[date] = valid_menus
        
        return validated_plan
    
    async def validate_menu_plan_async(self, plan: Dict[str, List[str]], menu_pool_by_category: Dict[str, List[str]]) -> Dict[str, List[str]]:
        """
        LLM이 생성한 식단 계획 검증 및 수정 (비동기 버전)

        Args:
            plan: 생성된 식단 계획
            menu_pool_by_category: 카테고리 별 메뉴 풀

        Returns:
            Dict: 검증 및 수정된 식단 계획
        """
        # 최소한 비동기 추가
        await asyncio.sleep(0)
        # 기존 동기 메서드 활용
        return self.validate_menu_plan(plan, menu_pool_by_category)

    def _find_similar_menu(self, menu: str, menu_pool: List[str]) -> Optional[str]:
        """메뉴 풀에서 유사한 메뉴 찾기"""
        for valid_menu in menu_pool:
            # 3글자 이상 부분 문자열이 일치하면 유사 메뉴로 간주
            # => 나중에 수정해야 함
            if len(menu) >= 3 and menu[:3] in valid_menu:
                return valid_menu
        return None

    def generate_alternatives(self, plan: Dict[str,List[str]], menu_data:Dict[str,Any]) -> Dict[str, Dict[str, List[str]]]:
        """
        각 메뉴별 대체 메뉴 생성

        Args:
            plan: 검증된 식단 계획
            menu_data: 메뉴 데이터
        Returns:
            Dict: 날짜별, 메뉴별 대체 메뉴 목록
        """

        # 메뉴별 카테고리 매핑
        menu_categories = menu_data.get("menu_categories", {})
        categorized_menus = menu_data.get("categorized_menus", {})
        menu_preference = menu_data.get("menu_preference", {})

        # 디버깅 출력
        if settings.DEBUG:
            print(f"[MENU][generate_alternatives] categorized_menus keys: {categorized_menus.keys() if categorized_menus else 'None'}")
            print(f"[MENU][generate_alternatives] menu_preference keys count: {len(menu_preference) if menu_preference else 'None'}")

        alternatives = {}

        # menu_categories가 없는 경우 추가 처리
        if not menu_categories and "categorized_menus" in menu_data:
            menu_categories = {}
            # 역방향 매핑 생성
            for category, menus in menu_data["categorized_menus"].items():
                for menu in menus:
                    if isinstance(menu, str):  # 문자열인 경우만 처리
                        menu_categories[menu] = category
                    if isinstance(menu, str):  # 문자열인 경우만 처리
                        menu_categories[menu] = category

        # 날짜별 대체 메뉴 생성
        for date, menus in plan.items():
            date_alternatives = {}

            # 메뉴별 대체 메뉴 생성
            for menu in menus:
                # 메뉴 카테고리 확인
                category = menu_categories.get(menu, '기타')

                # 같은 카테고리에서 대체 메뉴 선택
                alt_menus = []
                if category in categorized_menus:
                    # 같은 카테고리의 다른 메뉴들
                    same_category_menus = [m for m in categorized_menus[category] if m != menu]

                    sorted_menus = sorted(
                        same_category_menus,
                        key=lambda m: menu_preference.get(m, 0) if isinstance(m, str) else 0,
                        reverse=True
                    )

                    top_menus = sorted_menus[:min(30, len(sorted_menus))]

                    # 상위 15개 중에서 랜덤하게 3개 선택 (메뉴가 3개 미만이면 모두 선택)
                    if len(top_menus) > 3:
                        alt_menus = random.sample(top_menus, 3)
                    else:
                        alt_menus = top_menus
                    
                    top_menus = sorted_menus[:min(30, len(sorted_menus))]

                    # 상위 15개 중에서 랜덤하게 3개 선택 (메뉴가 3개 미만이면 모두 선택)
                    if len(top_menus) > 3:
                        alt_menus = random.sample(top_menus, 3)
                    else:
                        alt_menus = top_menus
                    
                # 대체 메뉴 저장
                date_alternatives[menu] = alt_menus

            alternatives[date] = date_alternatives

        return alternatives
    
    async def generate_alternatives_async(self, plan: Dict[str, List[str]], menu_data:Dict[str, Any])  -> Dict[str, Dict[str, List[str]]]:
        """
        각 메뉴별 대체 메뉴 생성 (비동기 버전)

        Args:
            plan: 검증된 식단 계획
            menu_data: 메뉴 데이터
        Returns:
            Dict: 날짜별, 메뉴별 대체 메뉴 목록
        """
        await asyncio.sleep(0)
        # 기존 동기 메서드 활용
        return self.generate_alternatives(plan, menu_data)

    async def get_menu_data(self, menu_ids: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """
        메뉴 데이터 조회
        
        ver1. 더미데이터 생성용
        
        Args:
            menu_ids: 조회할 메뉴 ID 목록 (None이면 전체)
        Returns:
            List[Dict]: 메뉴 정보 목록
        """

        menu_data = [
            {
                "menu_id": "M001",
                "menu_name": "돈삼겹숙주덮밥",
                "calories": 699.96,
                "carbs": 92.09,
                "fat": 21.40,
                "protein": 29.31,
                "sodium": 1182.88
            },
            {
                "menu_id": "M002",
                "menu_name": "실파계란국",
                "calories": 193.04,
                "carbs": 5.35,
                "fat": 11.11,
                "protein": 16.19,
                "sodium": 1263.97
            },
            {
                "menu_id": "M003",
                "menu_name": "당면김말이강정",
                "calories": 323.25,
                "carbs": 24.21,
                "fat": 15.56,
                "protein": 18.34,
                "sodium": 413.14
            }
        ]

        # 메뉴 ID 필터링 (있으면)
        if menu_ids:
            return [menu for menu in menu_data if menu["menu_id"] in menu_ids]
        return menu_data
    
    async def get_menu_categories(self) -> Dict[str, List[str]]:
        """
        카테고리별 메뉴 목록 조회 (더미데이터 생성용)

        Returns:
            Dict[str, List[str]]: 카테고리별 메뉴 목록
        """
        return {
            "밥류": ["돈삼겹숙주덮밥", "김치볶음밥", "비빔밥"],
            "국류": ["실파계란국", "미역국", "된장국"],
            "반찬류": ["당면김말이강정", "시금치나물", "깍두기"]
        }
    
    async def get_menu_preference(self, menu_names: List[str]) -> Dict[str, float]:
        """
        메뉴별 선호도 조회(더미데이터 생성용)
        
        Args:
            menu_names: 조회할 메뉴명 목록
        Returns:
            Dict[str, float]: 메뉴별 선호도
        """
        preference_data = {
            "돈삼겹숙주덮밥": 4.5,
            "실파계란국": 3.8,
            "당면김말이강정": 4.2,
            "김치볶음밥": 4.3,
            "미역국": 3.5,
            "된장국": 3.7,
            "시금치나물": 3.0,
            "깍두기": 4.0,
            "비빔밥": 4.7
        }

        # 요청 메뉴만 필터링
        return {menu: score for menu, score in preference_data.items() if menu in menu_names}
    
    async def get_menu_leftover(self, menu_names: List[str]) -> Dict[str, float]:
        """
        메뉴별 잔반율 조회(더미데이터 생성용)

        Args:
            menu_names: 조회할 메뉴명 목록
        
        Returns:
            Dict[str, float]: 메뉴별 잔반율
        """
        
        leftover_data = {
            "돈삼겹숙주덮밥": 0.15,
            "실파계란국": 0.25,
            "당면김말이강정": 0.10,
            "김치볶음밥": 0.18,
            "미역국": 0.30,
            "된장국": 0.28,
            "시금치나물": 0.40,
            "깍두기": 0.20,
            "비빔밥": 0.12
        }

        return {menu: rate for menu, rate in leftover_data.items() if menu in menu_names}