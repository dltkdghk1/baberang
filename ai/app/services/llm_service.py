import json, time
import os
import asyncio

from typing import Dict, Any, Optional
from openai import OpenAI

from ..core.prompts import PromptTemplates
from ..config import settings
openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)

# schema 정의부
waste_plan_fn: Dict[str, Any] = {
    "name": "waste_plan",
    "description": "잔반율을 최소화하는 식단 플랜 생성",
    "parameters": {
        "type": "object",
        "properties": {
            "plan": {
                "type": "object",
                "description": "날짜별 카테고리화된 메뉴 구성 (날짜를 키로, 메뉴명-카테고리 매핑을 값으로)",
                "additionalProperties": {
                    "type": "object",
                    "description": "메뉴 이름을 키로, 카테고리를 값으로 하는 매핑",
                    "additionalProperties": {
                        "type": "string",
                        "enum": ["soup", "rice", "main", "side"]
                    }
                }
            }
        },
        "required": ["plan"]
    }
}

nutrition_plan_fn: Dict[str, Any] = {
    "name": "nutrition_plan",
    "description": "영양 균형을 고려한 식단 플랜",
    "parameters": {
        "type": "object",
        "properties": {
            "plan": {
                "type": "object",
                "description": "날짜별 카테고리화된 메뉴 구성 (날짜를 키로, 메뉴명-카테고리 매핑을 값으로)",
                "additionalProperties": {
                    "type": "object",
                    "description": "메뉴 이름을 키로, 카테고리를 값으로 하는 매핑",
                    "additionalProperties": {
                        "type": "string",
                        "enum": ["soup", "rice", "main", "side"]
                    }
                }
            }
        },
        "required": ["plan"]
    }
}

integration_plan_fn: Dict[str, Any] = {
    "name": "integration_plan",
    "description": "영양 균형과 선호도를 고려한 균형적인 식단 플랜",
    "parameters": {
        "type": "object",
        "properties": {
            "plan": {
                "type": "object",
                "description": "날짜별 카테고리화된 메뉴 구성 (날짜를 키로, 메뉴명-카테고리 매핑을 값으로)",
                "additionalProperties": {
                    "type": "object",
                    "description": "메뉴 이름을 키로, 카테고리를 값으로 하는 매핑",
                    "additionalProperties": {
                        "type": "string",
                        "enum": ["soup", "rice", "main", "side"]
                    }
                }
            }
        },
        "required": ["plan"]
    }
}


health_report_fn: Dict[str, Any] = {
    "name": "health_report",
    "description": "학생 식사 정보 기반 건강 리포트 생성",
    "parameters": {
        "type": "object",
        "properties": {
            "analyzeReport": {
                "type": "string",
                "description": "현재 BMI와 식습관을 분석하여 건강 상태를 평가한 리포트"
            },
            "plan": {
                "type": "string",
                "description": "식습관 개선을 위한 구체적인 계획과 방법"
            },
            "opinion": {
                "type": "string",
                "description": "전반적인 건강 상태와 개선 방향에 대한 종합 의견"
            }
        },
        "required": ["analyzeReport", "plan", "opinion"]
    }
}

class LLMService:
    """LLM 서비스 클래스"""

    def __init__(self, model_name: Optional[str]=None, temperature: Optional[float] = None):
        """
        LLM 서비스 초기화

        Args:
            model_name: gpt-4(기본)
            temperature: 0.2(기본)
        """

        self.model_name = model_name or settings.LLM_MODEL
        self.temperature = temperature or settings.LLM_TEMPERATURE

        # LLM 클라이언트 초기화
        self.llm = OpenAI(
            api_key=settings.OPENAI_API_KEY
        )

        # 로깅
        if settings.DEBUG:
            print(f"[LLM] Initialized with model: {self.model_name}, temp: {self.temperature}")
    
    async def generate_structured_response(self, prompt: str,
                                           function_def: Dict[str, Any] = None, system_prompt: Optional[str] = None
                                           ) -> Dict[str, Any]:
        """
        구조화된 JSON 응답 생성

        Args:
            prompt: 사용자 프롬프트
            system_prompt: 시스템 프롬프트
        
        Returns:
            Dict: 파싱된 JSON객체
        """

        # (1) JSON 전용 시스템 메시지
        system = system_prompt or f"당신은 함수 호출만을 사용해 응답하는 AI입니다. {function_def['name']} 함수를 사용하여 결과를 반환하세요."

        # (2) 메시지 페이로드를 dict로 구성
        messages = [
            {"role": "system", "content": system},
            {"role": "user",   "content": prompt}
        ]

        if settings.DEBUG:
            print(f"[LLM][generate_structured_response] Requesting structured response")
            print(f"시스템 프롬프트: {system}")
            print(f"사용자 프롬프트: {prompt}")
        

        # function calling을 위한 openai SDK 적용
        resp = await asyncio.to_thread(
            openai_client.chat.completions.create,
            model=self.model_name,
            messages=messages,
            temperature=self.temperature,
            functions=[function_def],
            function_call="auto"
        )

        if settings.DEBUG:
            print("[DEBUG] resp = :", resp)

        message = resp.choices[0].message

        if settings.DEBUG:
            print("[DEBUG] function_call =", message.function_call)
            print("[DEBUG] function_call.name =", message.function_call.name)
            print("[DEBUG] function_call.arguments =", message.function_call.arguments)

        if message.function_call:
            try:
                if settings.DEBUG:
                    print(f"원본 함수 호출 응답: {message.function_call.arguments}")
                payload = json.loads(message.function_call.arguments)
                if len(payload) == 0:
                    if settings.DEBUG:
                        print(f"[ERROR] 빈 응답이 반환되었습니다. 프롬프트 내용을 확인하세요.")
                        return {}
                
                # 함수 이름에 따라 처리
                function_name = message.function_call.name
                if function_name == "health_report":
                    return payload
                
                elif "plan" in payload and function_name in ["waste_plan", "nutrition_plan", "integration_plan"]:
                    return payload["plan"]
                else:
                    return payload
            except Exception as e:
                print(f"[ERROR] 응답 처리 중 오류: {str(e)}")
                raise
    
    async def generate_health_report(self,
                                    bmi: float,
                                    leftover: Dict[str, float],
                                    leftover_most: Dict[str, Any],
                                    leftover_least: Dict[str, Any],
                                    nutrient: Dict[str, Dict[str, Any]]) -> Dict[str, str]:
        """ 학생 식사 정보를 기반으로 건강 리포트를 생성합니다. """

        # 프롬프트 포맷팅
        formatted_prompt = PromptTemplates.report_template(
            bmi=bmi,
            leftover=json.dumps(leftover, ensure_ascii=False),
            leftover_most=json.dumps(leftover_most, ensure_ascii=False),
            leftover_least=json.dumps(leftover_least, ensure_ascii=False),
            nutrient=json.dumps(nutrient, ensure_ascii=False)
        )

        if settings.DEBUG:
            print(f"[LLM][generate_health_report] 건강 리포트 생성 요청")
            start_time = time.time()

        try:
            # Function Calling 사용하여 생성
            report = await self.generate_structured_response(
                prompt=formatted_prompt,
                function_def=health_report_fn,
                system_prompt="당신은 학생 건강 분석 전문가입니다. 제공된 데이터를 분석하여 맞춤형 건강 리포트를 생성하세요."
            )

            if settings.DEBUG:
                elapsed = time.time() - start_time
                print(f"[LLM] 건강 리포트 생성 완료 (소요시간: {elapsed:.2f}초)")
            
            return report
        except Exception as e:
            if settings.DEBUG:
                print(f"[ERROR] 건강 리포트 생성 중 오류 발생: {str(e)}")