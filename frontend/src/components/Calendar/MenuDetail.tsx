import { useState, useRef, useEffect, useCallback } from 'react';
import { MenuDataType } from '../../pages/Calendar/index';
import axios from 'axios';
import API_CONFIG from '../../config/api';
import { showToast } from '../../utils/sweetalert';
import { useAuthStore } from '../../store/authStore';

interface MenuDetailProps {
  selectedDate: string | null;
  menuData: MenuDataType;
  onMenuUpdate?: (date: string, updatedMenu: string[]) => void; // 메뉴 업데이트 콜백 (선택 사항)
}

// 메뉴 업데이트 요청 타입
interface UpdateMenuRequest {
  menu: string;
  date: string;
  alternative_menu: string;
}

interface PopupPosition {
  top: number;
  left: number;
}

// 영양소 정보 응답 타입
interface NutrientResponse {
  양: number;
  영양소: Record<string, string>;
}

const MenuDetail = ({ selectedDate, menuData, onMenuUpdate }: MenuDetailProps) => {
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<{ name: string; index: number } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [popupPosition, setPopupPosition] = useState<PopupPosition>({ top: 0, left: 0 });
  const [localMenuData, setLocalMenuData] = useState<MenuDataType>(menuData); // 로컬 상태로 menuData 관리
  const [isNextMonth, setIsNextMonth] = useState(false); // 다음 달 여부
  const [nutritionData, setNutritionData] = useState<Record<string, string>>({}); // 영양소 정보
  const [servingAmount, setServingAmount] = useState<number | null>(null);
  const { accessToken } = useAuthStore();
  const [dailyCalories, setDailyCalories] = useState<number | null>(null);
  const menuRefs = useRef<(HTMLDivElement | null)[]>([]);

  // menuData가 변경되면 localMenuData도 업데이트
  useEffect(() => {
    setLocalMenuData(menuData);
  }, [menuData]);

    useEffect(() => {
    const fetchCalories = async () => {
      if (!selectedDate || !accessToken) {
        setDailyCalories(null);
        return;
      }
      try {
        const token = accessToken.startsWith('Bearer ')
          ? accessToken
          : `Bearer ${accessToken}`;
        // /api/v1/menu/oneday?date=YYYY-MM-DD
        const url = API_CONFIG.getUrl(
          API_CONFIG.ENDPOINTS.MEAL.ONE_DAY,
          { date: selectedDate }
        );
        const res = await axios.get<{ menu: string[]; totalCalories: number }>(url, {
          headers: { Authorization: token }
        });
        setDailyCalories(res.data.totalCalories);
      } catch {
        setDailyCalories(null);
      }
    };
    fetchCalories();
  }, [selectedDate, accessToken]);

  // 선택한 날짜가 현재 기준 다음 달인지 확인하는 함수
  const checkIfNextMonth = (dateString: string): boolean => {
    if (!dateString) return false;

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-11

    const selectedDate = new Date(dateString);
    const selectedYear = selectedDate.getFullYear();
    const selectedMonth = selectedDate.getMonth(); // 0-11

    // 같은 해의 다음 달이거나, 다음 해의 경우
    if (
      (selectedYear === currentYear && selectedMonth > currentMonth) ||
      selectedYear > currentYear
    ) {
      return true;
    }

    return false;
  };

  // 메뉴 항목 클릭 시 대체 메뉴 또는 영양소 정보 조회
  const handleMenuClick = async (menuName: string, index: number) => {
    if (!selectedDate || !accessToken) return;

    // 클릭한 메뉴 항목의 위치 계산
    const menuElement = menuRefs.current[index];
    if (menuElement) {
      const rect = menuElement.getBoundingClientRect();
      setPopupPosition({
        top: rect.top + window.scrollY - 10, // 메뉴와 같은 높이
        left: rect.left - 210, // 메뉴 왼쪽에 붙이기 (말풍선 너비 + 여백)
      });
    }

    // 현재 선택된 날짜가 다음 달인지 확인
    const isNextMonthDate = checkIfNextMonth(selectedDate);
    setIsNextMonth(isNextMonthDate);

    try {
      setLoading(true);
      setSelectedMenu({ name: menuName, index });

      // Authorization 헤더 설정
      const authHeaderValue = accessToken.startsWith('Bearer ')
        ? accessToken
        : `Bearer ${accessToken}`;

      if (isNextMonthDate) {
        // 다음 달인 경우 대체 메뉴 API 호출 (GET 요청)
        const url = `${API_CONFIG.ENDPOINTS.MEAL.MENU_ALTERNATIVES}?menu=${encodeURIComponent(
          menuName
        )}&date=${selectedDate}`;

        const response = await axios.get(url, {
          headers: {
            Authorization: authHeaderValue,
            'Content-Type': 'application/json',
          },
        });

        // 대체 메뉴 데이터 설정
        if (response.data && Array.isArray(response.data.alternatives || response.data)) {
          // API 응답 형식에 따라 alternatives 속성 또는 직접 배열이 올 수 있음
          setAlternatives(response.data.alternatives || response.data);
          setShowModal(true);
        } else {
          setAlternatives([]);
          showToast('대체 메뉴가 없습니다.', 'info');
        }
      } else {
        // 현재 달이나 과거 달인 경우 영양소 정보 API 호출
        const dateStr = selectedDate;

        const url = API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.MEAL.MENU_NUTRIENT, {
          menu: menuName,
          date: dateStr,
        });

        const response = await axios.get<NutrientResponse>(url, {
          headers: {
            Authorization: authHeaderValue,
            'Content-Type': 'application/json',
          },
        });

        setServingAmount(response.data.양)
        if (response.data && response.data.영양소) {
          setNutritionData(response.data.영양소);
          setShowModal(true);
        } else {
          setNutritionData({});
          showToast('영양소 정보가 없습니다.', 'info');
        }
      }
    } catch {
      showToast('정보를 가져오는데 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 대체 메뉴 선택 시 메뉴 업데이트
  const handleAlternativeSelect = async (alternativeMenu: string) => {
    if (!selectedDate || !selectedMenu || !accessToken) return;

    try {
      setLoading(true);

      // Authorization 헤더 설정
      const authHeaderValue = accessToken.startsWith('Bearer ')
        ? accessToken
        : `Bearer ${accessToken}`;

      // 메뉴 업데이트 API 호출
      const updateRequest: UpdateMenuRequest = {
        date: selectedDate,
        menu: selectedMenu.name,
        alternative_menu: alternativeMenu,
      };

      const response = await axios.patch(API_CONFIG.ENDPOINTS.MEAL.UPDATE_MENU, updateRequest, {
        headers: {
          Authorization: authHeaderValue,
          'Content-Type': 'application/json',
        },
      });

      // 업데이트 성공 시 로컬 menuData 상태 업데이트
      if (response.status === 200) {
        // 로컬 메뉴 데이터 복사
        const updatedMenuData = { ...localMenuData };

        // 해당 날짜의 메뉴 배열 복사
        if (updatedMenuData[selectedDate] && updatedMenuData[selectedDate].menu) {
          const updatedMenu = [...updatedMenuData[selectedDate].menu];

          // 선택한 메뉴 항목을 대체 메뉴로 교체
          updatedMenu[selectedMenu.index] = alternativeMenu;

          // 업데이트된 메뉴 배열 적용
          updatedMenuData[selectedDate].menu = updatedMenu;

          // 로컬 상태 업데이트
          setLocalMenuData(updatedMenuData);

          // 부모 컴포넌트 콜백이 있으면 호출
          if (onMenuUpdate) {
            onMenuUpdate(selectedDate, updatedMenu);
          }
        }

        fetchCalories();

        // 성공 메시지 표시
        showToast('메뉴가 업데이트되었습니다.', 'success');
      } else {
        showToast('메뉴 업데이트에 실패했습니다.', 'error');
      }

      // 모달 닫기
      setShowModal(false);
    } catch {
      showToast('메뉴 업데이트에 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCalories = useCallback(async () => {
    if (!selectedDate || !accessToken) {
      setDailyCalories(null);
      return;
    }
    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      const token = accessToken.startsWith('Bearer ')
        ? accessToken
        : `Bearer ${accessToken}`;
      // /api/v1/menu/oneday?date=YYYY-MM-DD
      const url = API_CONFIG.getUrl(
        API_CONFIG.ENDPOINTS.MEAL.ONE_DAY,
        { date: selectedDate }
      );
      const res = await axios.get<{ menu: string[]; totalCalories: number }>(url, {
        headers: { Authorization: token }
      });
      setDailyCalories(res.data.totalCalories);
    } catch {
      setDailyCalories(null);
    }
  }, [selectedDate, accessToken]);

  // 그리고 useEffect를 아래와 같이 수정하세요
  useEffect(() => {
    fetchCalories();
  }, [fetchCalories]);

  // 모달 닫기
  const closeModal = () => {
    setShowModal(false);
    setAlternatives([]);
    setNutritionData({});
    setSelectedMenu(null);
    setServingAmount(null);
  };

  // 클릭 외부 감지 핸들러
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showModal) {
        const target = event.target as HTMLElement;
        const popupElement = document.getElementById('alternatives-popup');

        if (popupElement && !popupElement.contains(target)) {
          closeModal();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showModal]);

  // 선택된 날짜가 없는 경우
  if (!selectedDate) {
    return (
      <div
        className="w-1/5 bg-[#FCF8F3]/90 rounded-3xl p-4 flex flex-col h-full"
        style={{ width: '350px', flexShrink: 0 }}
      >
        <div className="h-full flex items-center justify-center text-gray-500">
          날짜를 선택하면 식단이 표시됩니다.
        </div>
      </div>
    );
  }

  // 선택된 날짜의 요일 계산
  const date = new Date(selectedDate);
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const dayOfWeek = weekdays[date.getDay()];

  // 날짜 포맷팅 (YYYY-MM-DD → MM월 DD일)
  const formattedDate = selectedDate
    ? `${parseInt(selectedDate.split('-')[1])}월 ${parseInt(selectedDate.split('-')[2])}일`
    : '';

  // 선택된 날짜에 메뉴 데이터가 없는 경우
  const hasNoMenu = !localMenuData[selectedDate] || localMenuData[selectedDate].menu.length === 0;

  return (
    <div
      className="w-1/5 bg-[#FCF8F3]/90 rounded-3xl p-4 flex flex-col h-full"
      style={{ width: '350px', flexShrink: 0 }}
    >
      <div className="flex flex-col h-full">
        <div className="text-base font-semibold text-center mb-3">
          {formattedDate} ({dayOfWeek}) 식단
        </div>
        <div className="flex-grow flex flex-col h-[320px]">
          {!hasNoMenu ? (
            // 메뉴가 있는 경우 메뉴 목록 표시
            <div className="flex-grow flex flex-col gap-1 items-center overflow-y-auto">
              {localMenuData[selectedDate].menu.map((item: string, index: number) => (
                <div
                  key={index}
                  ref={(el) => {
                    menuRefs.current[index] = el;
                  }}
                  className="bg-white/40 w-[95%] px-3 py-3 rounded-xl text-base shadow-sm text-center mb-2 cursor-pointer hover:bg-orange-50 transition-colors relative z-10"
                  onClick={() => handleMenuClick(item, index)}
                >
                  <div className="truncate">{item}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="text-gray-400 mb-6">메뉴 정보가 없습니다.</div>
            </div>
          )}
        </div>
      </div>

      {/* <div className="mt-2 text-center font-semibold text-gray-700 text-base">
        {dailyCalories !== undefined ? (
          <>
            총 열량: {' '}
            <span className="text-orange-500">
              {dailyCalories} kcal
            </span>
          </>
        ) : (
          ''
        )}
      </div> */}


      {/* 대체 메뉴 또는 영양소 정보 말풍선 팝업 */}
      {showModal && selectedMenu && (
        <div
          id="alternatives-popup"
          className="fixed z-50"
          style={{
            top: `${popupPosition.top}px`,
            left: `${popupPosition.left}px`,
            width: '200px', // 고정 너비
            height: 'auto',
          }}
        >
          <div className="bg-white/90 rounded-xl p-3 shadow-lg relative">
            {/* 말풍선 화살표 - 오른쪽으로 방향 변경 */}
            <div
              className="absolute w-3 h-3 bg-white/90 transform rotate-45"
              style={{
                top: '30px',
                right: '-6px',
              }}
            ></div>

            <div className="text-sm font-bold text-center text-orange-500">
              {isNextMonth ? '이런 메뉴는 어때요?' : '영양소 정보'}
            </div>

            {!isNextMonth && servingAmount !== null && (
              <div className="mb-2 text-xs text-gray-700 text-center">
                총 제공량 {servingAmount}g
              </div>
            )}

            {loading ? (
              <div className="text-center py-2 text-xs">로딩 중...</div>
            ) : isNextMonth ? (
              // 대체 메뉴 목록 - 다음 달인 경우
              <div
                className="overflow-y-auto mb-2"
                style={{ maxHeight: '180px', minHeight: '50px' }}
              >
                {alternatives.length > 0 ? (
                  <div className="grid gap-1">
                    {alternatives.map((alt, idx) => (
                      <div
                        key={idx}
                        className=" bg-gray-100 hover:bg-orange-100 p-2 rounded-lg cursor-pointer transition-colors text-xs text-center"
                        onClick={() => handleAlternativeSelect(alt)}
                      >
                        {alt}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-3 text-gray-500 text-xs">
                    대체 가능한 메뉴가 없습니다.
                  </div>
                )}
              </div>
            ) : (
              // 영양소 정보 목록 - 현재/과거 달인 경우
              <div className="overflow-y-auto" style={{ maxHeight: '83px', minHeight: '50px' }}>
                {Object.keys(nutritionData).length > 0 ? (
                  <div className="grid gap-1">
                    {Object.entries(nutritionData).map(([name, value], idx) => (
                      <div
                        key={idx}
                        className="w-[98%] flex justify-between items-center py-1 px-2 bg-gray-100 rounded-lg text-xs"
                      >
                        <span className="text-gray-700 truncate mr-2">{name}</span>
                        <span className="text-gray-700 whitespace-nowrap">{value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-3 text-gray-500 text-xs">
                    영양소 정보가 없습니다.
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-center">
              {isNextMonth ? (
                <button
                  className="bg-transparent hover:bg-red-400 px-3 py-1 rounded-lg transition-colors text-xs"
                  onClick={closeModal}
                >
                  취소
                </button>
              ) : (
                <button
                  className="absolute top-4 right-4 text-gray-500 hover:text-red-500 transition-colors"
                  onClick={closeModal}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuDetail;
