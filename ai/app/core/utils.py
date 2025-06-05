from typing import Dict, Any
import json, time
import re
from datetime import datetime, date
from ..config import settings

def parse_date(date_str: str) -> date:
    """
    날짜 문자열을 파싱하여 date 객체로 변환

    Args:
        date_str: 날짜 문자열 (YYYY-MM-DD)

    Returns:
        date: 파싱된 날짜
    """
    if settings.DEBUG:
        print(f"[UTILS][parse_date] Starting with parameters...")
        start_time = time.time()
    try:
        if settings.DEBUG:
            print(f"[UTILS][parse_date] Completed in {time.time() - start_time:.4f} seconds")
        return datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise ValueError(f"Invalid date format: {date_str}. Expected format: YYYY-MM-DD")

def parse_llm_json(text: str) -> Dict[str, Any]:
    """
    LLM 응답에서 JSON 추출
    
    Args:
        text: LLM 응답 텍스트
    Returns:
        Dict: 파싱된 JSON 객체
    """
    if settings.DEBUG:
        print(f"[UTILS][parse_llm_json] Starting with parameters...")
    # JSON 블록 추출
    json_pattern = r'```(?:json)?\s*\n([\s\S]*?)\n```'
    matches = re.findall(json_pattern, text)

    if matches:
        try:
            return json.loads(matches[0])
        except json.JSONDecodeError:
            pass
    
    # 전체 텍스트가 JSON인지 확인
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass


    # 날짜 형식 파싱 시도
    result = {}
    for line in text.splitlines():
        if ":" in line and not line.startswith("#") and not line.startswith("//"):
            parts = line.split(":", 1)
            if len(parts) == 2:
                date = parts[0].strip().replace('"', '').replace("'", '')
                menus_text = parts[1].strip()
                
                # 메뉴 리스트 추출
                if "[" in menus_text and "]" in menus_text:
                    menus_text = menus_text[menus_text.find("[")+1:menus_text.rfind("]")]
                
                menus = [m.strip().replace('"', '').replace("'", '') for m in menus_text.split(",")]
                result[date] = menus
    
    return result