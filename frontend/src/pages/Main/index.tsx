import { useState, useEffect } from 'react';
import MenuCard from '../../components/MainMenuCard';
import RateToggleCard from '../../components/RateToggle';
import NutritionInfo from '../../components/NutritionInfo';
import { defaultMenu, WasteData } from '../../data/menuData';
import API_CONFIG from '../../config/api';
import axios from 'axios';
import { useAuthStore } from '../../store/authStore';
import { ApiResponse, SatisfactionUpdate, parseMenuName, SSEMessageEvent } from '../../types/types';
import { EventSourcePolyfill } from 'event-source-polyfill';

const MainPage = () => {
  // 현재 날짜 기준으로 초기화
  const today = new Date();
  const initialDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const [currentDate, setCurrentDate] = useState(initialDate);
  const [currentMenuItems, setCurrentMenuItems] = useState<string[]>(defaultMenu);
  const [loading, setLoading] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<string | null>(null);

  // SSE에서 받은 데이터를 저장하는 상태들
  const [todayWasteData, setTodayWasteData] = useState<WasteData[]>([]);
  const [todayLeftoverData, setTodayLeftoverData] = useState<WasteData[]>([]);
  const [mealCompletionData, setMealCompletionData] = useState({
    completedStudents: 0,
    totalStudents: 0,
    completionRate: 0,
  });
  const { isAuthenticated, accessToken } = useAuthStore();

  // 메뉴 아이템 클릭 핸들러
  const handleMenuSelect = (menuItem: string) => {
    setSelectedMenu(menuItem);
  };

  // SSE 구독 설정을 위한 함수
  const setupSSEConnection = async () => {
    if (!isAuthenticated || !accessToken) return;

    // 토큰 유효성 검사 및 필요시 갱신
    const authStore = useAuthStore.getState();
    const isTokenValid = await authStore.validateCurrentToken();
    
    // 토큰이 유효하지 않고 갱신에 실패한 경우
    if (!isTokenValid) {
      return;
    }
    
    // 갱신 후 최신 토큰 가져오기
    const updatedToken = authStore.accessToken;
    if (!updatedToken) {
      return;
    }

    // SSE 구독 엔드포인트
    const subscribeUrl = API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.SATISFACTION.SUBSCRIBE);

    // useAuthStore에서 현재 로그인한 사용자 정보 가져오기
    const { user } = authStore;
    const schoolName = user?.schoolName || '명호고등학교';

    // schoolName을 쿼리 파라미터로 추가
    const subscribeUrlWithSchool = `${subscribeUrl}?schoolName=${encodeURIComponent(schoolName)}`;

    // 토큰 형식 확인 및 처리
    const authHeaderValue = updatedToken.startsWith('Bearer ')
      ? updatedToken
      : `Bearer ${updatedToken}`;

    
    // EventSourcePolyfill 사용 (헤더 지원)
    const eventSource = new EventSourcePolyfill(subscribeUrlWithSchool, {
      headers: {
        Authorization: authHeaderValue,
      },
      withCredentials: true,
    });

    // 초기 만족도 데이터 이벤트 처리 추가
    eventSource.addEventListener('initial-satisfaction', (event: SSEMessageEvent) => {
      try {
        const menuSatisfactions = JSON.parse(event.data);

        if (Array.isArray(menuSatisfactions)) {
          // 수신된 데이터를 WasteData 배열로 변환
          const initialData: WasteData[] = menuSatisfactions.map((item) => {
            // 선호도 점수 파싱 (문자열에서 숫자로)
            const avgSatisfaction = parseFloat(item.averageSatisfaction || '0');

            return {
              name: item.menuName,
              선호도: avgSatisfaction, // averageSatisfaction을 선호도로 설정
              잔반률: 0, // 초기 잔반률 값은 0으로 설정
            };
          });

          // 유효한 선호도 데이터가 있는 경우에만 상태 업데이트
          if (initialData.length > 0) {
            setTodayWasteData(initialData);
          }
        }
      } catch {
        // err
      }
    });

    // 초기 잔반률 데이터 이벤트 처리
    eventSource.addEventListener('initial-leftover', (event: SSEMessageEvent) => {
      try {
        const menuLeftovers = JSON.parse(event.data);

        if (Array.isArray(menuLeftovers)) {
          // 수신된 데이터를 WasteData 배열로 변환
          const initialData: WasteData[] = menuLeftovers.map((item) => {
            // leftoverRate가 이미 퍼센트(0-100)인지 또는 소수(0-1)인지 확인
            const leftoverRate =
              typeof item.leftoverRate === 'number'
                ? item.leftoverRate <= 1
                  ? item.leftoverRate * 100
                  : item.leftoverRate
                : 0;

            return {
              name: item.menuName,
              category: item.category,
              선호도: 0, // 선호도 초기값
              잔반률: leftoverRate, // 퍼센트 값으로 변환
            };
          });

          // 유효한 잔반률 데이터가 있는 경우에만 상태 업데이트
          if (initialData.length > 0) {
            setTodayLeftoverData(initialData);
          }
        }
      } catch {
        // err
      }
    });

    // 초기 식사 완료율 데이터 이벤트 처리
    eventSource.addEventListener('initial-completion-rate', (event: SSEMessageEvent) => {
      try {
        const completionData = JSON.parse(event.data);

        if (completionData && typeof completionData === 'object') {
          setMealCompletionData({
            completedStudents: completionData.completedStudents || 0,
            totalStudents: completionData.totalStudents || 0,
            completionRate: completionData.completionRate || 0,
          });
        }
      } catch {
        // err
      }
    });

    // 투표 이벤트 처리
    eventSource.addEventListener('satisfaction-update', (event: SSEMessageEvent) => {
      try {
        const data = JSON.parse(event.data) as SatisfactionUpdate;

        // 만족도 데이터만 업데이트 (잔반률과 연관짓지 않음)
        if (data.menuName && data.averageSatisfaction) {
          // 만족도 점수(1-5 범위)
          const avgSatisfaction = parseFloat(data.averageSatisfaction);

          setTodayWasteData((prevData) => {
            // 해당 메뉴가 이미 있는지 확인
            const menuIndex = prevData.findIndex((item) => item.name === data.menuName);

            // 데이터가 없는 경우를 처리하기 위한 기본값 설정
            let updatedData = [...prevData];

            if (menuIndex >= 0) {
              // 기존 메뉴인 경우 만족도 업데이트
              updatedData[menuIndex] = {
                ...updatedData[menuIndex],
                선호도: avgSatisfaction,
                // 잔반률은 변경하지 않음 (나중에 백엔드에서 별도로 받을 예정)
              };
            } else {
              // 새 메뉴인 경우 추가
              updatedData = [
                ...updatedData,
                {
                  name: data.menuName,
                  선호도: avgSatisfaction,
                  잔반률: 0, // 초기값 설정
                },
              ];
            }

            return updatedData;
          });
        } else if (Array.isArray(data)) {
          // 여러 메뉴 데이터를 한 번에 수신하는 경우
          setTodayWasteData((prevData) => {
            const updatedData = [...prevData];

            data.forEach((menuData) => {
              if (menuData.menuName && menuData.averageSatisfaction) {
                const avgSatisfaction = parseFloat(menuData.averageSatisfaction);
                const menuIndex = updatedData.findIndex((item) => item.name === menuData.menuName);

                if (menuIndex >= 0) {
                  // 기존 메뉴 업데이트
                  updatedData[menuIndex] = {
                    ...updatedData[menuIndex],
                    선호도: avgSatisfaction,
                  };
                } else {
                  // 새 메뉴 추가
                  updatedData.push({
                    name: menuData.menuName,
                    선호도: avgSatisfaction,
                    잔반률: 0,
                  });
                }
              }
            });

            return updatedData;
          });
        }
      } catch {
        // err
      }
    });

    // 잔반률 업데이트 이벤트 처리
    eventSource.addEventListener('leftover-update', (event: SSEMessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        if (Array.isArray(data)) {
          // 전체 데이터를 한번에 받는 경우
          const newLeftoverData = data.map((item) => {
            // leftoverRate가 이미 퍼센트(0-100)인지 또는 소수(0-1)인지 확인
            const leftoverRate =
              typeof item.leftoverRate === 'number'
                ? item.leftoverRate <= 1
                  ? item.leftoverRate * 100
                  : item.leftoverRate
                : 0;

            return {
              name: item.menuName,
              category: item.category,
              선호도: 0, // 기본값
              잔반률: leftoverRate, // 퍼센트 값으로 변환
            };
          });

          setTodayLeftoverData(newLeftoverData);
        } else if (data.menuName && typeof data.leftoverRate === 'number') {
          // 단일 메뉴 업데이트
          setTodayLeftoverData((prevData) => {
            const menuIndex = prevData.findIndex((item) => item.name === data.menuName);
            const updatedData = [...prevData];

            // leftoverRate가 이미 퍼센트(0-100)인지 또는 소수(0-1)인지 확인
            const leftoverRate =
              data.leftoverRate <= 1 ? data.leftoverRate * 100 : data.leftoverRate;

            if (menuIndex >= 0) {
              // 기존 메뉴 업데이트
              updatedData[menuIndex] = {
                ...updatedData[menuIndex],
                잔반률: leftoverRate,
              };
            } else {
              // 새 메뉴 추가
              updatedData.push({
                name: data.menuName,
                category: data.category,
                선호도: 0,
                잔반률: leftoverRate,
              });
            }

            return updatedData;
          });
        }
      } catch {
        // err
      }
    });

    // 식사 완료율 업데이트 이벤트 처리
    eventSource.addEventListener('completion-rate-update', (event: SSEMessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        if (data && typeof data === 'object') {
          setMealCompletionData({
            completedStudents: data.completedStudents || 0,
            totalStudents: data.totalStudents || 0,
            completionRate: data.completionRate || 0,
          });
        }
      } catch {
        // err
      }
    });

    // 연결 이벤트 처리
    eventSource.addEventListener('connect', () => {
      // 연결 성공 로그 제거
    });

    // 하트비트 이벤트 처리
    eventSource.addEventListener('heartbeat', () => {
      // 하트비트 로그 제거
    });

    // 기본 메시지 처리
    eventSource.onmessage = () => {};

    // 에러 처리
    eventSource.onerror = async () => {
 
      eventSource.close();

      // 연결 오류 발생 시 토큰 유효성을 먼저 확인
      const authStore = useAuthStore.getState();
      const wasTokenRefreshed = await authStore.refreshToken();
      
      if (wasTokenRefreshed) {
        setupSSEConnection(); // 토큰 갱신 성공시 즉시 재연결
      } else {
        // 토큰 갱신 실패 또는 다른 오류인 경우 5초 후 재연결 시도
        setTimeout(() => {
          setupSSEConnection();
        }, 5000);
      }
    };

    // 이벤트 소스 객체 반환 (정리 함수에서 사용)
    return eventSource;
  };

  // SSE 구독 설정
  useEffect(() => {
    // SSE 연결 설정
    let eventSource: EventSourcePolyfill | undefined;
    
    const initConnection = async () => {
      eventSource = await setupSSEConnection();
    };
    
    initConnection();

    // 컴포넌트 언마운트 시 SSE 연결 종료
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [isAuthenticated, accessToken]);

  // 식사 완료율 상태 변화 추적을 위한 useEffect
  useEffect(() => {
  }, [mealCompletionData]);

  // 일별 메뉴 데이터 가져오기
  const fetchDailyMenu = async (dateStr: string) => {
    try {
      setLoading(true);
      const { accessToken } = useAuthStore.getState();

      if (!accessToken) {
        return;
      }

      // API 엔드포인트는 API_CONFIG에서 확인하고 적절히 수정
      const endpoint = API_CONFIG.ENDPOINTS.MEAL.MENU_CALENDAR;

      // 날짜 파라미터 형식 조정 (API 명세에 맞게)
      const [year, month, day] = dateStr.split('-');
      const url = API_CONFIG.getUrl(endpoint, {
        year: year,
        month: month,
      });

      // 토큰 형식 확인 및 처리
      const authHeaderValue = accessToken.startsWith('Bearer ')
        ? accessToken
        : `Bearer ${accessToken}`;

      const response = await axios.get<ApiResponse>(url, {
        headers: {
          Authorization: authHeaderValue,
          'Content-Type': 'application/json',
        },
      });

      // 날짜 포맷을 항상 2자리로 맞추기
      const paddedDateStr = `${year.padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(
        day
      ).padStart(2, '0')}`;

      const dayData = response.data.days.find((d) => d.date === paddedDateStr);

      // 응답에 해당 날짜의 데이터가 없는 경우
      if (!dayData || !dayData.menu || dayData.menu.length === 0) {
        setCurrentMenuItems(defaultMenu);
        return;
      }

      // 해당 날짜의 데이터가 있는 경우
      if (dayData && dayData.menu && dayData.menu.length > 0) {
        // <br/> 태그로 분리하여 메뉴 항목으로 처리
        const allMenuItems: string[] = [];

        dayData.menu.forEach((menu) => {
          if (menu.menuName) {
            // <br/> 태그로 분리
            const parsedItems = parseMenuName(menu.menuName);
            allMenuItems.push(...parsedItems);
          }
        });

        // 메뉴가 있는 경우에만 설정
        if (allMenuItems.length > 0) {
          setCurrentMenuItems(allMenuItems);
        } else if (dayData.holiday && dayData.holiday.length > 0) {
          // 메뉴는 없지만 공휴일이 있는 경우
          setCurrentMenuItems([`오늘은 ${dayData.holiday[0]} 공휴일입니다.`]);
        } else {
          setCurrentMenuItems(defaultMenu);
        }
      } else {
        setCurrentMenuItems(defaultMenu);
      }
    } catch {
      // 오류 발생 시 기본 메뉴 설정
      setCurrentMenuItems(defaultMenu);
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 오늘 날짜의 데이터 가져오기
  useEffect(() => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(currentDate.getDate()).padStart(2, '0')}`;
    fetchDailyMenu(dateStr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 날짜 변경 시 메뉴 데이터 업데이트
  useEffect(() => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(currentDate.getDate()).padStart(2, '0')}`;
    fetchDailyMenu(dateStr);
    // 날짜가 변경되면 선택된 메뉴 초기화
    setSelectedMenu(null);
  }, [currentDate]);

  // 이전/다음 날짜 이동
  const goToPrevDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  return (
    <div className="min-h-screen w-full overflow-hidden relative">
      {/* 배경 이미지 */}
      <div className="absolute inset-0 z-0 bg-main bg-cover bg-center"></div>

      {/* 메인 컨텐츠 */}
      <div
        className="relative z-10 flex items-center justify-evenly"
        style={{ height: 'calc(100vh - 80px)', marginTop: '75px' }}
      >
        <div className="w-[90%] mx-auto">
          <div className="grid grid-cols-12 gap-14 w-full">
            {/* 식단 카드 - 높이 줄임 */}
            <div className="col-span-12 md:col-span-4">
              <div className="h-[73vh] grid grid-rows-2 gap-4">
                <div className="row-span-1">
                  <MenuCard
                    menuItems={currentMenuItems}
                    currentDate={currentDate}
                    onPrevDay={goToPrevDay}
                    onNextDay={goToNextDay}
                    loading={loading}
                    onMenuSelect={handleMenuSelect}
                  />
                </div>
                <div className="row-span-1">
                  <NutritionInfo selectedMenu={selectedMenu} currentDate={currentDate} />
                </div>
              </div>
            </div>

            {/* 실시간 잔반률/선호도 전환 카드 - SSE에서 받은 데이터 사용 */}
            <div className="col-span-12 md:col-span-8">
              <div className="h-[73vh]">
                <RateToggleCard
                  data={todayWasteData}
                  leftoverData={todayLeftoverData}
                  completionData={mealCompletionData}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainPage;
