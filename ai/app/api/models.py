from pydantic import BaseModel, Field, RootModel
from typing import List, Dict, Any, Optional

# 식단 생성 요청 To LLM
class PlanRequest(BaseModel):
    """Spring에서 전달받는 식단 생성 요청"""
    menuData: Dict[str, Dict[str, Dict[str, Any]]]  # {날짜: {메뉴명: {잔반율, 선호도, 영양소:{}}}}
    menuPool: Optional[Dict[str, Any]] = None # 사용 가능한 메뉴 목록
    holidays: Dict[str, Any] # {날짜: 공휴일}

class MenuOption(BaseModel):
    """카테고리별 메뉴 옵션"""
    primary: str # 주 추천 옵션
    alternatives: List[str] = Field(..., min_items=1, max_items=3) # 최대 대체 메뉴 3개

class MenuInfo(BaseModel):
    """메뉴 정보"""
    category: str  # 카테고리 정보 (soup, rice, main, side)
    alternatives: List[str] = Field(default_factory=list)  # 대체 메뉴

class MenuCategoryMapping(RootModel):
    """메뉴 이름을 키로, 카테고리를 값으로 하는 매핑"""
    root: Dict[str, str]

class DailyMenu(RootModel):
    """일별 식단 구성"""
    root: Dict[str, MenuInfo]

# 식단 생성 응답 From LLM
class PlanResponse(BaseModel):
    """FastAPI에서 Spring으로 보내는 응답"""
    # 날짜별 메뉴 리스트
    plan: Dict[str, Dict[str, MenuInfo]] # {날짜: {메뉴명: 카테고리, 대체 메뉴}}

# 학생 정보 모델
class StudentInfo(BaseModel):
    """학생 정보"""
    id: int
    name: str
    grade: int
    class_num: int = Field(..., alias="class")
    number: int

# 잔반 데이터 요청
class AnalyzeRequest(BaseModel):
    """식전/식후 이미지를 받아 잔반 분석을 요청합니다."""
    beforeImages: Dict[str, str]  # 식전 이미지 URL (key: side_1, side_2, side_3, rice, soup)
    afterImages: Dict[str, str]   # 식후 이미지 URL (key: side_1, side_2, side_3, rice, soup)
    studentInfo: StudentInfo      # 학생 정보

    class Config:
        populate_by_name = True

# 잔반 데이터 응답
class AnalyzeResponse(BaseModel):
    """메뉴별 잔반율과 상세 결과를 반환합니다."""
    leftoverRate: Dict[str, float]
    # leftoverDetails: Dict[str, dict]
    # beforeDetails: Dict[str, dict]
    # afterDetails: Dict[str, dict]
    studentInfo: StudentInfo

# 리포트 데이터 요청
class ReportRequest(BaseModel):
    bmi: float
    leftover: Dict[str, float]
    leftoverMost: Dict[str, Any]
    leftoverLeast: Dict[str, Any]
    nutrient: Dict[str, Dict[str, Any]]

# 리포트 데이터 응답
class ReportResponse(BaseModel):
    analyzeReport: str
    plan: str
    opinion: str