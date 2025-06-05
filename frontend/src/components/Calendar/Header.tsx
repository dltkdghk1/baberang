import {
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
  FiBarChart2,
  FiCalendar,
  FiEdit,
} from 'react-icons/fi';
import axios, { AxiosError } from 'axios';
import API_CONFIG from '../../config/api';
import { DishWasteRate } from '../../types/types';
import { showToast, showErrorAlert } from '../../utils/sweetalert';

// 메뉴 데이터 타입 정의
interface MenuItem {
  menuId: number;
  menuName: string;
}

interface MenuDay {
  date: string;
  dayOfWeekName: string;
  holiday: string | null;
  menu: MenuItem[];
}

interface MenuResponse {
  dayMenus?: MenuDay[];
  message?: string;
}

// 캘린더에서 사용할 메뉴 데이터 타입
export interface CalendarMenuData {
  [date: string]: {
    menu: string[];
    date?: string;
    wasteData?: DishWasteRate[];
    holiday?: string[];
  };
}

// API 응답을 캘린더에서 사용할 형식으로 변환하는 함수
const formatMenuDataForCalendar = (data: MenuResponse | MenuDay[] | MenuDay): CalendarMenuData => {
  const formattedData: CalendarMenuData = {};

  // dayMenus 배열이 있는 경우 (예: { dayMenus: [...] })
  if ('dayMenus' in data && Array.isArray(data.dayMenus)) {
    data.dayMenus.forEach((day: MenuDay) => {
      if (day.date && day.menu) {
        // menuName 값만 추출하여 문자열 배열로 변환
        const menuNames = day.menu.map((item) => item.menuName);
        formattedData[day.date] = {
          date: `${parseInt(day.date.split('-')[1])}월 ${parseInt(day.date.split('-')[2])}일`,
          menu: menuNames,
          wasteData: [],
          holiday: day.holiday ? [day.holiday] : [],
        };
      }
    });
  }
  // 데이터가 직접 배열인 경우 (예: [...])
  else if (Array.isArray(data)) {
    data.forEach((day: MenuDay) => {
      if (day.date && day.menu) {
        const menuNames = day.menu.map((item) => item.menuName);
        formattedData[day.date] = {
          date: `${parseInt(day.date.split('-')[1])}월 ${parseInt(day.date.split('-')[2])}일`,
          menu: menuNames,
          wasteData: [],
          holiday: day.holiday ? [day.holiday] : [],
        };
      }
    });
  }
  // data 자체가 단일 일자 데이터인 경우 (예: { date: "...", menu: [...] })
  else if ('date' in data && 'menu' in data) {
    const menuNames = data.menu.map((item: MenuItem) => item.menuName);
    formattedData[data.date] = {
      date: `${parseInt(data.date.split('-')[1])}월 ${parseInt(data.date.split('-')[2])}일`,
      menu: menuNames,
      wasteData: [],
      holiday: data.holiday ? [data.holiday] : [],
    };
  }

  return formattedData;
};

interface CalendarHeaderProps {
  displayYearMonth: string;
  showWasteChart: boolean;
  goToPrevMonth: () => void;
  goToNextMonth: () => void;
  toggleView: () => void;
  handleExcelDownload: () => void;
  isFutureMonth: boolean;
  isNextMonth: boolean; // 현재 날짜 기준 다음 달인지 여부
  hasMenu?: boolean; // 해당 달에 메뉴가 있는지 여부
  token?: string;
  selectedYear: number;
  selectedMonth: number;
  updateMenuData?: (data: CalendarMenuData) => void;
  onMenuGenerated?: () => void; // 메뉴 생성 완료 후 호출될 콜백 추가
  generatingMenu?: boolean; // 식단 생성 중인지 상태
  setGeneratingMenu?: (state: boolean) => void; // 식단 생성 상태 설정 함수
}

// 에러 응답 타입 정의
interface ErrorResponse {
  errorCode?: string;
  message?: string;
}

const CalendarHeader = ({
  displayYearMonth,
  showWasteChart,
  goToPrevMonth,
  goToNextMonth,
  toggleView,
  handleExcelDownload,
  isFutureMonth,
  isNextMonth,
  token,
  selectedYear,
  selectedMonth,
  updateMenuData,
  onMenuGenerated,
  setGeneratingMenu,
}: CalendarHeaderProps) => {
  // 메뉴 데이터 조회 함수
  const fetchMenuData = async (year: number, month: number) => {
    try {
      // year와 month 유효성 검사 및 보정
      if (isNaN(year) || year <= 0) {
        year = new Date().getFullYear();
      }

      if (isNaN(month) || month < 0 || month > 11) {
        month = new Date().getMonth();
      }

      if (!token) {
        return;
      }

      // API 요청 URL 및 헤더 설정
      // month는 0-based이므로 API 요청 시 1을 더함
      const monthValue = month + 1;

      const url = API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.MEAL.MENU_CALENDAR, {
        year: year.toString(),
        month: monthValue.toString(),
      });

      const authHeaderValue = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

      const response = await axios.get<MenuResponse | MenuDay[]>(url, {
        headers: {
          Authorization: authHeaderValue,
          'Content-Type': 'application/json',
        },
      });

      // API 응답 데이터를 캘린더 형식으로 변환
      const formattedData = formatMenuDataForCalendar(response.data);

      // 메뉴 데이터 업데이트
      if (updateMenuData) {
        updateMenuData(formattedData);
        // 데이터 조회 완료 메시지
        alert('다음 달 식단이 조회되었습니다.');
      }
    } catch (error: unknown) {
      // 에러 응답 처리
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        const errorData = axiosError.response.data as ErrorResponse;

        if (errorData.errorCode === 'INVALID_TOKEN') {
          alert('토큰이 유효하지 않습니다.');
        } else if (errorData.errorCode === 'USER_NOT_FOUND') {
          alert('사용자를 찾을 수 없습니다.');
        } else if (errorData.errorCode === 'INTERNAL_SERVER_ERROR') {
          alert('내부 서버 오류가 발생했습니다.');
        } else {
          alert(errorData.message || '메뉴 데이터 조회 중 오류가 발생했습니다.');
        }
      } else {
        alert('서버 연결에 실패했습니다.');
      }
    }
  };

  // 현재 선택된 달의 메뉴 데이터 불러오기
  const loadCurrentMonthMenuData = async () => {
    // 값이 undefined인 경우 현재 날짜로 설정
    const year =
      typeof selectedYear === 'number' && !isNaN(selectedYear)
        ? selectedYear
        : new Date().getFullYear();

    const month =
      typeof selectedMonth === 'number' &&
      !isNaN(selectedMonth) &&
      selectedMonth >= 0 &&
      selectedMonth <= 11
        ? selectedMonth
        : new Date().getMonth();

    // 선택된 달의 메뉴 조회
    await fetchMenuData(year, month);
  };

  // 다음달 메뉴 생성 함수
  const makeMonthMenu = async () => {
    try {
      // 토큰이 유효한지 확인
      if (!token) {
        return false;
      }

      // API 요청 URL 및 헤더 설정
      const url = API_CONFIG.ENDPOINTS.MEAL.MAKE_MONTH_MENU;
      const authHeaderValue = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

      // 선택된 달이 유효한지 확인
      if (
        typeof selectedYear !== 'number' ||
        typeof selectedMonth !== 'number' ||
        isNaN(selectedYear) ||
        isNaN(selectedMonth)
      ) {
        return false;
      }

      // month는 0-based이므로 API 요청 시 1을 더함
      const requestMonth = selectedMonth + 1;

      // API 요청 바디 출력
      const requestBody = {
        year: selectedYear,
        month: requestMonth,
      };

      const response = await axios.post<MenuResponse | MenuDay[]>(
        url,
        requestBody, // 현재 선택된 달의 연도와 월을 서버에 전달
        {
          headers: {
            Authorization: authHeaderValue,
            'Content-Type': 'application/json',
          },
        }
      );

      // 이미 다음 달 메뉴가 생성된 경우에 대한 처리
      if (
        'message' in response.data &&
        response.data.message === '이미 다음 달 메뉴가 생성되어 있습니다.'
      ) {
        // 토스트 알림 표시
        showToast('식단 생성은 한 번만 가능합니다.', 'info');

        // 이미 생성된 메뉴도 부모 컴포넌트에 알려 화면을 갱신하도록 함
        if (onMenuGenerated) {
          onMenuGenerated();
        }

        return false;
      } else {
        // 새로 생성된 메뉴 데이터 처리
        // API 응답 데이터를 캘린더 형식으로 변환
        const formattedData = formatMenuDataForCalendar(response.data);

        // 메뉴 데이터 업데이트
        if (updateMenuData) {
          updateMenuData(formattedData);
          // 메뉴 생성 완료 메시지
          showToast('식단이 생성되었습니다.', 'success');

          // 부모 컴포넌트에 메뉴 생성 완료를 알림
          if (onMenuGenerated) {
            onMenuGenerated();
          }

          return true;
        }
      }

      return false;
    } catch (error: unknown) {
      // 로딩 상태 해제
      if (setGeneratingMenu) {
        setGeneratingMenu(false);
      }

      // 에러 응답 처리
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        const errorData = axiosError.response.data as ErrorResponse;

        let errorMessage = '식단 생성 중 오류가 발생했습니다.';

        if (errorData.errorCode === 'INVALID_TOKEN') {
          errorMessage = '토큰이 유효하지 않습니다.';
        } else if (errorData.errorCode === 'USER_NOT_FOUND') {
          errorMessage = '사용자를 찾을 수 없습니다.';
        } else if (errorData.errorCode === 'INTERNAL_SERVER_ERROR') {
          errorMessage = '내부 서버 오류가 발생했습니다.';
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }

        // 에러 알림 표시
        showErrorAlert('오류', errorMessage);
      } else {
        showErrorAlert('오류', '서버 연결에 실패했습니다.');
      }

      throw error;
    }
  };

  const handleMenuButtonClick = () => {
    if (showWasteChart) {
      // 잔반율 화면에서 캘린더로 돌아갈 때
      toggleView();
    } else if (isFutureMonth && isNextMonth) {
      // 다음 달일 때만 식단 생성 버튼 처리

      // 로딩 상태 설정
      if (setGeneratingMenu) {
        setGeneratingMenu(true);
      }

      // 메뉴 생성 기능 호출
      makeMonthMenu()
        .then(() => {
          // onMenuGenerated 콜백이 없는 경우만 로컬에서 데이터 로드 (이중 로드 방지)
          // onMenuGenerated가 없는 경우에만 로컬에서 loadCurrentMonthMenuData 호출
          if (!onMenuGenerated) {
            loadCurrentMonthMenuData();
          }
        })
        .catch(() => {
          // 오류 발생 시 로딩 상태 해제
          if (setGeneratingMenu) {
            setGeneratingMenu(false);
          }
        });
      // 캘린더 뷰 유지 (토글하지 않음)
    } else if (!isFutureMonth) {
      // 과거 또는 현재 월에서 잔반율 보기 버튼 클릭 시
      toggleView();
    }
  };

  return (
    <div className="grid grid-cols-3 items-center p-4 bg-white/50">
      {/* 왼쪽 - 뷰 전환 버튼 */}
      <div className="flex items-center">
        {/* 다음 달만 생성 버튼 표시, 그외 미래 달은 버튼 숨김 */}
        {(showWasteChart || !isFutureMonth || (isFutureMonth && isNextMonth)) && (
          <button
            onClick={handleMenuButtonClick}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 ml-6"
          >
            {showWasteChart ? (
              <>
                <FiCalendar size={20} />
                <span>캘린더 보기</span>
              </>
            ) : (
              <>
                {isFutureMonth && isNextMonth ? (
                  <>
                    <FiEdit size={20} />
                    <span>식단생성하기</span>
                  </>
                ) : (
                  <>
                    <FiBarChart2 size={20} />
                    <span>월간 잔반률 보기</span>
                  </>
                )}
              </>
            )}
          </button>
        )}
      </div>

      {/* 중앙 - 이전/다음 버튼과 제목 */}
      <div className="flex items-center justify-center">
        <button
          onClick={goToPrevMonth}
          className="text-gray-600 hover:text-gray-900 focus:outline-none"
        >
          <FiChevronLeft size={30} />
        </button>
        <h1 className="text-xl font-bold text-center w-[50%]">
          {displayYearMonth} {showWasteChart ? '잔반률' : '식단표'}
        </h1>
        <button
          onClick={goToNextMonth}
          className="text-gray-600 hover:text-gray-900 focus:outline-none"
        >
          <FiChevronRight size={30} />
        </button>
      </div>

      {/* 오른쪽 - Excel 버튼 */}
      <div className="flex justify-end">
        {!showWasteChart && (
          <button
            onClick={handleExcelDownload}
            className="flex items-center space-x-2 text-green-600 hover:text-green-800 mr-6"
          >
            <FiDownload size={20} />
            <span>Excel 저장</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default CalendarHeader;
