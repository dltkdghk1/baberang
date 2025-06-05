import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

import { MenuDataType, NutrientInfo } from '../../types/types';
import { getNutrient } from '../../utils/nutrientApi';
import { showErrorAlert, showSuccessAlert } from '../../utils/sweetalert';

/**
 * 월별 식단 + 영양소를 Excel(xlsx)로 저장
 */
export const downloadMenuExcel = async (
  year: number,
  month: number,              // 0-based
  menuData: MenuDataType,
  token: string,
): Promise<void> => {
  try {
    /* ============ (1) 날짜별 영양소 합계가 비어 있으면 채운다 ============ */
    const dates = Object.keys(menuData);
    const concurrency = 5;                 // 동시 호출 제한
    const queue: Promise<void>[] = [];

    for (const date of dates) {
      if (!menuData[date].nutrient) {
        const jobs = menuData[date].menu.map((m) => getNutrient(m, date, token));
        const p = Promise.all(jobs).then((list) => {
          const sum = list.reduce<NutrientInfo>(
            (acc, cur) =>
              cur
                ? {
                    kcal: acc.kcal + cur.kcal,
                    carbo: acc.carbo + cur.carbo,
                    protein: acc.protein + cur.protein,
                    fat: acc.fat + cur.fat,
                    iron: acc.iron + (cur.iron || 0),
                    magnesium: acc.magnesium + (cur.magnesium || 0),
                    zinc: acc.zinc + (cur.zinc || 0),
                    calcium: acc.calcium + (cur.calcium || 0),
                    potassium: acc.potassium + (cur.potassium || 0),
                    phosphorus: acc.phosphorus + (cur.phosphorus || 0),
                    sugar: acc.sugar + (cur.sugar || 0),
                    sodium: acc.sodium + (cur.sodium || 0),
                  }
                : acc,
            { 
              kcal: 0, carbo: 0, protein: 0, fat: 0, iron: 0, magnesium: 0, 
              zinc: 0, calcium: 0, potassium: 0, phosphorus: 0, sugar: 0, sodium: 0 
            },
          );
          menuData[date].nutrient = sum;
        });
        queue.push(p);
        if (queue.length >= concurrency) await Promise.race(queue);
      }
    }
    await Promise.all(queue);
    /* ===================================================================== */

    // -------------- (2) 첫 번째 시트: 식단 메뉴 -----------------
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // 최대 메뉴 칸 수
    let maxMenu = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (key in menuData) maxMenu = Math.max(maxMenu, menuData[key].menu.length);
    }

    const menuHeader = ['날짜', '요일'];
    for (let i = 0; i < maxMenu; i++) menuHeader.push(`메뉴 ${i + 1}`);

    const menuSheetData: string[][] = [menuHeader];
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

      const row: string[] = [
        `${month + 1}월 ${String(d).padStart(2, '0')}일`,
        dayNames[dateObj.getDay()],
      ];

      const menus = menuData[key]?.menu ?? [];
      for (let i = 0; i < maxMenu; i++) row.push(menus[i] ?? '');

      menuSheetData.push(row);
    }

    // -------------- (3) 두 번째 시트: 영양소 정보 -----------------
    const nutrientHeader = [
      '날짜', '요일', '열량(kcal)', '탄수화물(g)', '단백질(g)', '지방(g)',
      '철(mg)', '마그네슘(mg)', '아연(mg)', '칼슘(mg)', '칼륨(mg)', 
      '인(mg)', '당류(g)', '나트륨(mg)'
    ];

    const nutrientSheetData: string[][] = [nutrientHeader];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

      const n = menuData[key]?.nutrient;
      const row: string[] = [
        `${month + 1}월 ${String(d).padStart(2, '0')}일`,
        dayNames[dateObj.getDay()],
        n ? n.kcal.toFixed(1) : '',
        n ? n.carbo.toFixed(1) : '',
        n ? n.protein.toFixed(1) : '',
        n ? n.fat.toFixed(1) : '',
        n ? n.iron.toFixed(2) : '',
        n ? n.magnesium.toFixed(2) : '',
        n ? n.zinc.toFixed(2) : '',
        n ? n.calcium.toFixed(1) : '',
        n ? n.potassium.toFixed(1) : '',
        n ? n.phosphorus.toFixed(1) : '',
        n ? n.sugar.toFixed(1) : '',
        n ? n.sodium.toFixed(1) : '',
      ];

      nutrientSheetData.push(row);
    }

    // -------------- (4) XLSX 시트 생성 및 파일 저장 -----------------
    const wb = XLSX.utils.book_new();
    
    // 첫 번째 시트: 식단 메뉴
    const menuWs = XLSX.utils.aoa_to_sheet(menuSheetData);
    menuWs['!cols'] = [
      { wch: 10 },
      { wch: 5 },
      ...Array(maxMenu).fill({ wch: 20 }),
    ];
    XLSX.utils.book_append_sheet(wb, menuWs, `${year}년 ${month + 1}월 식단표`);
    
    // 두 번째 시트: 영양소 정보
    const nutrientWs = XLSX.utils.aoa_to_sheet(nutrientSheetData);
    nutrientWs['!cols'] = [
      { wch: 10 },
      { wch: 5 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, nutrientWs, `${year}년 ${month + 1}월 영양소 정보`);

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), `${year}년 ${month + 1}월 식단표.xlsx`);
    showSuccessAlert('엑셀 파일 다운로드 완료');
  } catch {
    showErrorAlert('엑셀 파일 다운로드 오류', '영양소 정보를 포함하는 데 실패했습니다.');
  }
};