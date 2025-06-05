export interface NutrientInfo {
  kcal: number;        // 에너지(kcal)
  carbo: number;       // 탄수화물(g)
  protein: number;     // 단백질(g)
  fat: number;         // 지방(g)
  iron: number;        // 철(mg)
  magnesium: number;   // 마그네슘(mg)
  zinc: number;        // 아연(mg)
  calcium: number;     // 칼슘(mg)
  potassium: number;   // 칼륨(mg)
  phosphorus: number;  // 인(mg)
  sugar: number;       // 당류(g)
  sodium: number;      // 나트륨(mg)
}

// 학생 관련 타입
export interface StudentInfo {
  gender: string;
  name: string;
  isTagged: boolean;
}

export interface StudentListResponse {
  students: {
    studentId: number;
    studentName: string;
    grade: number;
    classNum: number;
    number: number;
    gender: string;
  }[];
}

export interface StudentDetailResponse {
  studentId: number;
  studentName: string;
  grade: number;
  classNum: number;
  number: number;
  height: number;
  weight: number;
  date: string;
  content: string;
  schoolName: string;
  weeklyLeftoverAverage: number;
}

export interface StudentType {
  id: number;
  name: string;
  grade: number;
  classNum: number;
  studentNum: number;
  number?: number;
  gender: string;
  bmi?: number;
  wasteRate?: string;
  height?: number;
  weight?: number;
  date?: string;
  content?: string;
  schoolName?: string;
}

// NFC 관련 타입
export interface NFCInfo {
  pk: string;
  grade: string;
  class: string;
  number: string;
  name: string;
  gender: string;
  status: string;
  isTagged: boolean;
}

// 인증 관련 타입
export interface User {
  userPk: number;
  loginId: string;
  nutritionistName: string;
  city: string;
  schoolName: string;
}

export interface LoginCredentials {
  loginId: string;
  password: string;
}

// 메뉴 관련 타입
export interface Menu {
  id: number;
  name: string;
  calories: number;
  category: string;
}

// MenuItem 타입 통합 (중복 정의 해결)
export interface MenuItem {
  menuId: number;
  menuName: string;
  date?: string;
  menu?: string[];
  wasteData?: WasteData[];
  holiday?: string[];
  nutrient?: NutrientInfo;
}

export interface DayMenuData {
  date: string;
  dayOfWeekName: string;
  menu: MenuItem[];
  holiday?: string[];
}

export interface MenuResponse {
  days: DayMenuData[];
}

export interface MenuDataType {
  [key: string]: MenuItem;
}

export interface DayData {
  date: string;
  dayOfWeekName: string;
  menu: MenuItem[];
  holiday?: string[];
}

export interface ApiResponse {
  days: DayData[];
}

// 잔반 데이터 관련 타입
export interface LeftoverData {
  dishName: string;
  wasteRate: number;
}

export interface DailyLeftoverResponse {
  date: string;
  leftoverRate: number;
  dishes: LeftoverData[];
}

export interface WeeklyLeftoverResponse {
  days: {
    date: string;
    leftoverRate: number;
  }[];
}

export interface MonthlyLeftoverResponse {
  days: {
    date: string;
    day: number;
    leftoverRate: number;
  }[];
}

export interface DailyWasteRate {
  date: string;
  day: number;
  wasteRate: number;
}

export interface DishWasteRate {
  name: string;
  잔반률: number;
}

export interface ChartClickData {
  activePayload?: Array<{
    payload: DailyWasteRate;
  }>;
}

// 학교 관련 타입
export interface City {
  name: string;
  id: number;
}

export interface School {
  name: string;
  id: number;
}

// 캘린더 관련 타입
export interface CalendarDay {
  date: Date;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  hasMenu: boolean;
  dateString: string;
}

// 메뉴 에디터 관련 타입
export interface MenuData {
  date: string;
  meals: string[];
}

// 만족도 조사 관련 타입
export interface SatisfactionUpdate {
  menuId: number;
  menuName: string;
  totalVotes: number;
  averageSatisfaction: string;
  updatedAt: string;
}

// 헤더 관련 타입
export interface HeaderProps {
  isLoggedIn: boolean;
}

// 메뉴카드 관련 타입
export interface MenuCardProps {
  menuItems: string[];
  currentDate: Date;
  onPrevDay: () => void;
  onNextDay: () => void;
  loading?: boolean;
  onMenuSelect?: (menuItem: string) => void;
}

// 영양정보 관련 타입
export interface NutritionInfoProps {
  selectedMenu: string | null;
  currentDate: Date;
}

export interface NutrientResponse {
  영양소: Record<string, string>;
  메뉴: string;
}

// 선호도 차트 관련 타입
export interface PreferenceChartProps {
  data: WasteData[];
}

export interface PreferenceData {
  name: string;
  선호도: number;
}

// 여기에서 WasteData를 export로 명시적으로 정의합니다
export interface WasteData {
  name: string;
  잔반률: number;
  선호도?: number;
  category?: string;
}

// 잔반률 관련 타입
export interface WasteRateCardProps {
  data: WasteData[];
}

// 식사 완료율 관련 타입
export interface MealCompletionRateProps {
  completionRate: number; // 0-100 사이의 값
  totalStudents: number;
  completedStudents: number; // 식사를 완료한 학생 수
}

// 레이트 토글 카드 관련 타입
export interface RateToggleCardProps {
  data: WasteData[];
  leftoverData?: WasteData[];
  completionData?: {
    completedStudents: number;
    totalStudents: number;
    completionRate: number;
  };
}

// 엑셀 내보내기 관련 타입
export interface ExcelExportProps {
  data: InventoryItem[];
  filename?: string;
}

// InventoryItem 타입을 export로 명시적으로 정의합니다
export interface InventoryItem {
  id?: number;
  date: string;
  productName: string;
  supplier: string;
  price: number;
  orderedQuantity: number;
  usedQuantity: number;
  unit?: string;
  orderUnit?: string;
  useUnit?: string;
}

// 로그인 관련 타입
export interface LoginPageFormData {
  loginId: string;
  password: string;
}

// SSE 메시지 이벤트 타입
export interface SSEMessageEvent extends Event {
  data: string;
}

// 기타
export const parseMenuName = (menuName: string): string[] => {
  return menuName.split(',').map((item) => item.trim());
};
