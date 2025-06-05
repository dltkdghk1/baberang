export const holidays: string[] = [
  '2025-01-01', // 신정
  '2025-03-01', // 삼일절
  '2025-05-01', // 근로자의날
  '2025-05-05', // 어린이날
  '2025-05-06', // 어린이날 대체공휴일
  '2025-05-23',
  // '2025-06-06', // 현충일
  '2025-08-15', // 광복절
  '2025-10-03', // 개천절
  '2025-10-09', // 한글날
  '2025-12-25', // 크리스마스
];

// 사용자가 추가한 학교별 재량휴업일
export let schoolHolidays: string[] = [];

// 학교별 재량휴업일 추가
export function addSchoolHoliday(dateStr: string): void {
  if (!schoolHolidays.includes(dateStr) && !holidays.includes(dateStr)) {
    schoolHolidays.push(dateStr);
  }
}

// 학교별 재량휴업일 삭제
export function removeSchoolHoliday(dateStr: string): void {
  schoolHolidays = schoolHolidays.filter((date) => date !== dateStr);
}

// 학교별 재량휴업일 전체 설정 (기존 데이터 덮어쓰기)
export function setSchoolHolidays(dates: string[]): void {
  schoolHolidays = [...dates];
}

// 학교별 재량휴업일 전체 가져오기
export function getSchoolHolidays(): string[] {
  return [...schoolHolidays];
}

// 날짜(YYYY-MM-DD)가 공휴일인지 판별
export function isHoliday(dateStr: string): boolean {
  return holidays.includes(dateStr) || schoolHolidays.includes(dateStr);
}
