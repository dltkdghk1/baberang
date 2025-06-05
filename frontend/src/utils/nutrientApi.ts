// src/utils/nutrientApi.ts
import axios from 'axios';
import API_CONFIG from '../config/api';          // 상대 경로는 구조에 맞게
import { NutrientInfo } from '../types/types';   // 방금 추가한 타입

/**
 * 단일 메뉴·날짜에 대한 영양소 정보 요청
 * @param menu      메뉴명 (예: "국물떡볶이")
 * @param date      YYYY-MM-DD
 * @param token     "Bearer ..." 형식의 인증 토큰
 * @returns         NutrientInfo | null
 */
// src/utils/nutrientApi.ts 수정 부분
export async function getNutrient(
  menu: string,
  date: string,
  token: string,
): Promise<NutrientInfo | null> {
  try {
    const url = API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.MEAL.MENU_NUTRIENT, {
      menu,
      date,
    });

    const { data } = await axios.get(url, {
      headers: { Authorization: token.startsWith('Bearer') ? token : `Bearer ${token}` },
    });

    const n = data['영양소'];
    if (!n) return null;

    const num = (v: string = '0') => parseFloat(v.replace(/[^0-9.]/g, '') || '0');

    return {
      kcal: num(n['에너지']),
      carbo: num(n['탄수화물']),
      protein: num(n['단백질']),
      fat: num(n['지방']),
      iron: num(n['철']),
      magnesium: num(n['마그네슘']),
      zinc: num(n['아연']),
      calcium: num(n['칼슘']),
      potassium: num(n['칼륨']),
      phosphorus: num(n['인']),
      sugar: num(n['당류']),
      sodium: num(n['나트륨']),
    };
  } catch {
    return null; // 오류 시 null 반환
  }
}