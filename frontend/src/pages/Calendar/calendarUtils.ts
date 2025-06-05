import { isHoliday, holidays } from '../../data/holidays';
import { MenuDataType } from './index';

// 주말 여부 확인
export const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  // 0: 일요일, 6: 토요일
  return day === 0 || day === 6;
};

// 평일(근무일) 여부 확인
export const isWorkday = (dateStr: string): boolean => {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const key = `${yyyy}-${mm}-${dd}`;
  return !isWeekend(date) && !isHoliday(key);
};

// 해당 월의 달력 날짜 생성
export interface CalendarDay {
  date: number;
  type: string;
  hasMenu?: boolean;
  isHoliday?: boolean; // 공휴일 여부
  holidayName?: string; // 공휴일 이름
}

export const createCalendarDays = (
  selectedYear: number,
  selectedMonth: number,
  menuData: MenuDataType
): CalendarDay[] => {
  // 선택된 달의 첫 날짜
  const firstDay = new Date(selectedYear, selectedMonth, 1);
  // 선택된 달의 마지막 날짜
  const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
  // 선택된 달의 첫 날이 무슨 요일인지 (0: 일요일, 1: 월요일, ..., 6: 토요일)
  const firstDayOfMonth = firstDay.getDay();
  // 선택된 달의 일수
  const daysInMonth = lastDay.getDate();

  // 이전 달의 마지막 날짜들 (빈 칸으로 표시)
  const prevMonthDays = Array(firstDayOfMonth)
    .fill(null)
    .map((_, i) => ({
      date: new Date(selectedYear, selectedMonth, 0).getDate() - firstDayOfMonth + i + 1,
      type: 'prev',
    }));

  // 현재 달의 날짜들
  const currentMonthDays = Array(daysInMonth)
    .fill(null)
    .map((_, i) => {
      const dateString = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(
        i + 1
      ).padStart(2, '0')}`;

      // 날짜 객체 생성
      const dateObj = new Date(selectedYear, selectedMonth, i + 1);

      // 주말인지 확인 (0: 일요일, 6: 토요일)
      const isWeekendDay = dateObj.getDay() === 0 || dateObj.getDay() === 6;

      // 해당 날짜에 메뉴가 있고, 메뉴가 비어있지 않고, 주말이 아닌 경우에만 hasMenu = true
      const hasMenuData =
        dateString in menuData && menuData[dateString]?.menu?.length > 0 && !isWeekendDay;

      // API 응답의 공휴일 정보 확인
      const isApiHoliday =
        dateString in menuData &&
        menuData[dateString]?.holiday &&
        menuData[dateString]?.holiday?.length > 0;

      // API 응답의 공휴일 이름
      const apiHolidayName = isApiHoliday ? menuData[dateString]?.holiday?.[0] : undefined;

      // holidays.ts에 정의된 공휴일인지 확인
      const isStaticHoliday = holidays.includes(dateString);

      // 최종 공휴일 여부 및 이름 결정
      // API 응답의 공휴일 정보가 있으면 그것을 우선 사용하고,
      // 없으면 holidays.ts에 정의된 공휴일 사용
      const isHolidayDay = isApiHoliday || isStaticHoliday;

      // 공휴일 이름 결정
      let holidayName = apiHolidayName;
      if (!holidayName && isStaticHoliday) {
        // holidays.ts의 공휴일은 주석으로 이름이 표시되어 있으므로
        // 간단히 '공휴일'로 표시
        holidayName = '공휴일';
      }

      return {
        date: i + 1,
        type: 'current',
        hasMenu: hasMenuData,
        isHoliday: isHolidayDay,
        holidayName: holidayName,
      };
    });

  return [...prevMonthDays, ...currentMonthDays];
};
