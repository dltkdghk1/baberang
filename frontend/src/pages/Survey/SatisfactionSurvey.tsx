import { useState, useEffect } from 'react';
import Button from '../../components/ui/button';
import { WasteData } from '../../data/menuData';
import API_CONFIG from '../../config/api';
import axios from 'axios';
import { useAuthStore } from '../../store/authStore';
import { EventSourcePolyfill } from 'event-source-polyfill';
import { showErrorAlert, showSuccessAlert } from '../../utils/sweetalert';
import { FaHeart } from 'react-icons/fa';

// 만족도 레벨 정의
const satisfactionLevels = [
  { id: 'veryPoor', label: '아쉬워요', value: 1 },
  { id: 'poor', label: '그럭저럭', value: 2 },
  { id: 'average', label: '보통', value: 3 },
  { id: 'good', label: '좋아요', value: 4 },
  { id: 'excellent', label: '최고예요', value: 5 },
];

interface MenuItem {
  id: number;
  name: string;
  satisfaction: number | null;
  votes: number; // 전체 투표 수
  satisfactionVotes: number[]; // 각 만족도 레벨별 투표 수를 저장 (인덱스 0=만족도1, 인덱스1=만족도2 ...)
}

// 초기 만족도 데이터 DTO 인터페이스 - 백엔드 DTO와 일치시킴
interface MenuSatisfactionDto {
  menuName: string;
  voteCount?: number; // 백엔드에서는 voteCount로 투표 수를 전달
  averageSatisfaction: string;
}

// 메뉴 이름 정규화 함수 (공백 제거, 소문자 변환)
const normalizeMenuName = (name: string): string => name.trim().toLowerCase();

// 애니메이션 아이템 인터페이스
interface AnimationItem {
  id: string; // 고유 ID
  menuId: number;
  value: number;
  timestamp: number;
}

// 타이머 객체 제거

// +1 애니메이션 요소 컴포넌트
interface VoteAnimationProps {
  selectedValue: number; // 1-5 사이의 값 (어떤 만족도 레벨이 선택되었는지)
  onComplete: () => void;
}

const VoteAnimation: React.FC<VoteAnimationProps> = ({ selectedValue, onComplete }) => {
  // 애니메이션 지속 시간 줄이기
  const animationDurationMs = 450; // ms 단위, 빠른 애니메이션을 위해 값 줄임 (400-500ms 사이로 조정)

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, animationDurationMs);

    return () => clearTimeout(timer);
  }, [onComplete, animationDurationMs]);

  return (
    <div className="absolute top-0 left-0 w-full h-full z-20 pointer-events-none">
      <div
        className="font-bold text-2xl rounded-full w-12 h-12 flex items-center justify-center absolute top-1/2"
        style={{
          left: `calc(${(selectedValue - 1) * 20}% + 10%)`,
          transform: 'translate(-50%, -80%)', // 위치 조정
          animation: `vote-animation ${animationDurationMs / 1000}s forwards`,
        }}
      >
        <FaHeart size={25} color="red" />
      </div>
    </div>
  );
};

const SatisfactionSurvey = () => {
  const [todayMenus, setTodayMenus] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preferenceData, setPreferenceData] = useState<WasteData[]>([]);
  const [totalVotes, setTotalVotes] = useState<number>(0);
  const [isClosed, setIsClosed] = useState<boolean>(false);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);

  // 여러 애니메이션을 동시에 표시하기 위해 배열로 변경
  const [animatingVotes, setAnimatingVotes] = useState<AnimationItem[]>([]);

  const { isAuthenticated, accessToken, user } = useAuthStore();

  // 애니메이션 완료 핸들러
  const handleAnimationComplete = (id: string) => {
    setAnimatingVotes((prev) => prev.filter((item) => item.id !== id));
  };

  // SSE 구독 설정 - 실시간 만족도 데이터 수신
  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      setError('로그인이 필요합니다');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // SSE 구독 엔드포인트
    const subscribeUrl = API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.SATISFACTION.SUBSCRIBE);

    // 학교 이름 가져오기
    const schoolName = user?.schoolName || '명호고등학교';

    // schoolName을 쿼리 파라미터로 추가
    const subscribeUrlWithSchool = `${subscribeUrl}?schoolName=${encodeURIComponent(schoolName)}`;

    // 토큰 형식 확인 및 처리
    const authHeaderValue = accessToken.startsWith('Bearer ')
      ? accessToken
      : `Bearer ${accessToken}`;

    // EventSourcePolyfill 사용 (헤더 지원)
    const eventSource = new EventSourcePolyfill(subscribeUrlWithSchool, {
      headers: {
        Authorization: authHeaderValue,
      },
      withCredentials: true,
    });

    // 초기 만족도 데이터를 기반으로 선호도 데이터 업데이트하는 함수
    const updatePreferenceDataFromSatisfactionData = (
      satisfactionData: MenuSatisfactionDto[]
    ): void => {
      const updatedPreferenceData = satisfactionData.map((menuData) => {
        const avgSatisfaction = parseFloat(menuData.averageSatisfaction);
        // 1-5 척도에서 잔반률로 변환 (5점 만점이 0% 잔반률, 1점이 100% 잔반률)
        const wasteRate = 100 - avgSatisfaction * 20;
        return {
          name: menuData.menuName,
          잔반률: wasteRate,
        };
      });

      setPreferenceData(updatedPreferenceData);
    };

    // 초기 만족도 데이터 처리
    eventSource.addEventListener('initial-satisfaction', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as MenuSatisfactionDto[];

        if (Array.isArray(data) && data.length > 0) {
          // SSE로 받은 메뉴 데이터로 todayMenus 초기화
          const initialMenus: MenuItem[] = data.map((item, index) => {
            const avgSatisfaction = parseFloat(item.averageSatisfaction);
            // 투표자 수 - totalVotes 값이 있으면 사용하고 없으면 기본값으로 0 사용
            const voteCount = item.voteCount !== undefined ? item.voteCount : 0;

            // 평균 만족도를 기반으로 레벨별 투표 배열 생성
            const newSatisfactionVotes = [0, 0, 0, 0, 0];
            const satisfactionLevel = Math.round(avgSatisfaction);
            const mainLevel = Math.max(1, Math.min(5, satisfactionLevel));
            // 모든 투표가 평균에 가장 가까운 레벨에 몰린 것으로 가정
            newSatisfactionVotes[mainLevel - 1] = voteCount;

            return {
              id: index + 1, // menuId가 없으면 index 기반으로 id 생성
              name: item.menuName,
              satisfaction: null,
              votes: voteCount,
              satisfactionVotes: newSatisfactionVotes,
            };
          });

          // 총 투표 수 계산
          const totalVoteCount = initialMenus.reduce((total, menu) => total + menu.votes, 0);
          setTotalVotes(totalVoteCount);

          setTodayMenus(initialMenus);

          // 선호도 데이터도 함께 업데이트
          updatePreferenceDataFromSatisfactionData(data);

          // 로딩 완료
          setIsLoading(false);
        } else {
          setError('메뉴 데이터를 불러오는데 실패했습니다');
          setIsLoading(false);
        }
      } catch {
        setError('메뉴 데이터를 불러오는데 실패했습니다');
        setIsLoading(false);
      }
    });

    // 투표 이벤트 처리
    eventSource.addEventListener('satisfaction-update', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        // 백엔드에서 배열 형태로 데이터를 보내므로 배열인지 확인
        if (Array.isArray(data)) {
          // 각 메뉴 항목에 대한 업데이트 처리
          setTodayMenus((prevMenus) => {
            return prevMenus.map((menu) => {
              const normalizedMenuName = normalizeMenuName(menu.name);

              // 해당 메뉴의 만족도 데이터 찾기 (정규화된 이름으로 비교)
              const menuData = data.find(
                (item) =>
                  normalizeMenuName(item.menuName) === normalizedMenuName ||
                  normalizeMenuName(item.menuName).includes(normalizedMenuName) ||
                  normalizedMenuName.includes(normalizeMenuName(item.menuName))
              );

              if (menuData) {
                const avgSatisfaction = parseFloat(menuData.averageSatisfaction);
                // totalVotes 값이 있으면 사용하고 없으면 기본값으로 0 사용
                const voteCount = menuData.voteCount !== undefined ? menuData.voteCount : 0;

                // 평균 만족도를 기반으로 레벨별 투표 배열 생성
                const newSatisfactionVotes = [0, 0, 0, 0, 0];
                const satisfactionLevel = Math.round(avgSatisfaction);
                const mainLevel = Math.max(1, Math.min(5, satisfactionLevel));
                newSatisfactionVotes[mainLevel - 1] = voteCount;

                return {
                  ...menu,
                  votes: voteCount,
                  satisfactionVotes: newSatisfactionVotes,
                };
              }
              return menu;
            });
          });

          // 총 투표 수 업데이트
          const updatedMenus = [...todayMenus];
          data.forEach((menuData) => {
            const menuIndex = updatedMenus.findIndex(
              (menu) =>
                normalizeMenuName(menu.name) === normalizeMenuName(menuData.menuName) ||
                normalizeMenuName(menu.name).includes(normalizeMenuName(menuData.menuName)) ||
                normalizeMenuName(menuData.menuName).includes(normalizeMenuName(menu.name))
            );

            if (menuIndex >= 0 && menuData.voteCount !== undefined) {
              updatedMenus[menuIndex].votes = menuData.voteCount;
            }
          });

          const newTotalVotes = updatedMenus.reduce((total, menu) => total + menu.votes, 0);
          setTotalVotes(newTotalVotes);

          // 선호도 데이터 업데이트
          updatePreferenceDataFromSatisfactionData(data);
        } else if (data.menuName && data.averageSatisfaction) {
          // 단일 메뉴 업데이트 형식인 경우 (백엔드가 단일 객체로 보낼 경우)
          const avgSatisfaction = parseFloat(data.averageSatisfaction);
          // totalVotes 값이 없으면 기본값으로 0 사용
          const voteCount = data.voteCount !== undefined ? data.voteCount : 0;

          setTodayMenus((prevMenus) => {
            const normalizedUpdateMenuName = normalizeMenuName(data.menuName);

            return prevMenus.map((menu) => {
              const normalizedMenuName = normalizeMenuName(menu.name);

              // 메뉴 이름 비교 (정확히 일치하거나 포함 관계인 경우)
              const isMatch =
                normalizedMenuName === normalizedUpdateMenuName ||
                normalizedMenuName.includes(normalizedUpdateMenuName) ||
                normalizedUpdateMenuName.includes(normalizedMenuName);

              if (isMatch) {
                // SSE로 받은 평균 만족도를 각 레벨별 투표수로 역산하기
                const newSatisfactionVotes = [0, 0, 0, 0, 0];
                const satisfactionLevel = Math.round(avgSatisfaction);
                const mainLevel = Math.max(1, Math.min(5, satisfactionLevel));
                newSatisfactionVotes[mainLevel - 1] = voteCount;

                return {
                  ...menu,
                  votes: voteCount,
                  satisfactionVotes: newSatisfactionVotes,
                };
              }
              return menu;
            });
          });

          // 총 투표 수 업데이트
          const updatedTotalVotes = todayMenus.reduce((total, menu) => {
            // 해당 메뉴면 새 투표수 사용, 아니면 기존 투표수 사용
            const isTargetMenu =
              normalizeMenuName(menu.name) === normalizeMenuName(data.menuName) ||
              normalizeMenuName(menu.name).includes(normalizeMenuName(data.menuName)) ||
              normalizeMenuName(data.menuName).includes(normalizeMenuName(menu.name));

            return total + (isTargetMenu ? voteCount : menu.votes);
          }, 0);

          setTotalVotes(updatedTotalVotes);

          // 선호도 데이터도 함께 업데이트
          setPreferenceData((prevData) => {
            const menuIndex = prevData.findIndex((item) => item.name === data.menuName);
            // 1-5 척도에서 잔반률로 변환 (5점 만점이 0% 잔반률, 1점이 100% 잔반률)
            const wasteRate = 100 - avgSatisfaction * 20;

            if (menuIndex >= 0) {
              const updatedData = [...prevData];
              updatedData[menuIndex] = {
                ...updatedData[menuIndex],
                잔반률: wasteRate,
              };
              return updatedData;
            } else {
              return [
                ...prevData,
                {
                  name: data.menuName,
                  잔반률: wasteRate,
                },
              ];
            }
          });
        }
      } catch {
        // err
      }
    });

    // 연결 이벤트 처리
    eventSource.addEventListener('connect', () => {
      // 연결 성공
    });

    // 하트비트 이벤트 처리
    eventSource.addEventListener('heartbeat', () => {
      // 하트비트 수신
    });

    // 에러 처리
    eventSource.onerror = () => {
      eventSource.close();
    };

    // 컴포넌트 언마운트 시 SSE 연결 종료
    return () => {
      eventSource.close();
    };
  }, [isAuthenticated, accessToken, user?.schoolName]);

  // 만족도 선택 처리 (API 호출)
  const handleSatisfactionChange = async (menuId: number, satisfactionValue: number) => {
    if (isClosed) return; // 마감된 경우 변경 불가

    try {
      const selectedMenu = todayMenus.find((menu) => menu.id === menuId);
      if (!selectedMenu) return;

      // 새 애니메이션 추가 (고유 ID 생성)
      const newAnimationId = `anim_${menuId}_${satisfactionValue}_${Date.now()}`;
      const newAnimation = {
        id: newAnimationId,
        menuId,
        value: satisfactionValue,
        timestamp: Date.now(),
      };

      // 새 애니메이션을 기존 애니메이션 목록에 추가
      setAnimatingVotes((prev) => [...prev, newAnimation]);

      // 만족도 투표 API 요청 데이터
      const voteData = {
        schoolName: user?.schoolName || '명호고등학교',
        menuname: selectedMenu.name,
        satisfactionScore: satisfactionValue, // satisfactionValue 값을 그대로 전송
      };

      // API 엔드포인트
      const voteUrl = API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.SATISFACTION.VOTE);

      // 토큰 형식 확인 및 처리
      const authHeaderValue =
        accessToken && accessToken.startsWith('Bearer ') ? accessToken : `Bearer ${accessToken}`;

      // 만족도 투표 API 호출
      await axios.post(voteUrl, voteData, {
        headers: {
          Authorization: authHeaderValue,
          'Content-Type': 'application/json',
        },
      });

      // 로컬 UI 업데이트 - 투표 수만 증가, satisfaction 값은 설정하지 않음
      const updatedMenus = todayMenus.map((menu) => {
        if (menu.id === menuId) {
          // 만족도 레벨별 투표 수 배열 업데이트 (배열 인덱스는 0부터 시작하므로 -1 해줌)
          const updatedSatisfactionVotes = [...menu.satisfactionVotes];
          updatedSatisfactionVotes[satisfactionValue - 1]++;

          return {
            ...menu,
            votes: menu.votes + 1,
            satisfactionVotes: updatedSatisfactionVotes,
          };
        }
        return menu;
      });

      setTodayMenus(updatedMenus);
      setTotalVotes(totalVotes + 1);

      // 선호도 데이터 업데이트
      const updatedPreferenceData = updatePreferenceData(updatedMenus);
      setPreferenceData(updatedPreferenceData);
    } catch {
      // err
    }
  };

  // 선호도 데이터 업데이트
  const updatePreferenceData = (menus: MenuItem[]): WasteData[] => {
    // 각 메뉴별로 평균 만족도 계산
    const updatedPreferenceData = menus.map((menu) => {
      // 각 만족도 레벨별 투표 수를 이용하여 총 만족도 점수 계산
      let totalSatisfactionScore = 0;

      // 각 만족도 레벨(1-5)별 투표 수 합산
      for (let i = 0; i < 5; i++) {
        totalSatisfactionScore += (i + 1) * menu.satisfactionVotes[i];
      }

      // 1-5 점수 범위에서 평균 계산
      const avgSatisfaction = menu.votes > 0 ? totalSatisfactionScore / menu.votes : 3;

      // 잔반률 계산: 5점 만점을 100% 기준으로 변환 (5점=0% 잔반률, 1점=80% 잔반률)
      const wasteRate = 100 - avgSatisfaction * 20;

      return {
        name: menu.name,
        잔반률: wasteRate,
      };
    });

    return updatedPreferenceData;
  };

  // 결과 마감 처리
  const handleClose = async () => {
    try {
      setIsLoading(true);

      // 마감 데이터 준비
      todayMenus.map((menu) => {
        const preference = preferenceData.find((item) => item.name === menu.name);
        // 잔반률에서 다시 만족도로 변환 (5점 만점 기준)
        const avgSatisfaction = preference ? 5 - preference.잔반률 / 20 : 3;

        return {
          menuId: menu.id,
          name: menu.name,
          votes: menu.votes,
          averageSatisfaction: avgSatisfaction,
        };
      });

      setIsClosed(true);
      setShowConfirmation(false);
      showSuccessAlert('만족도 조사가 마감되었습니다.');
    } catch {
      showErrorAlert('만족도 제출에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="h-screen bg-cover bg-center flex items-center justify-center"
      style={{
        backgroundImage: 'url("/images/background/background_dashboard.png")',
      }}
    >
      {/* CSS 애니메이션 정의 */}
      <style>
        {`
          @keyframes vote-animation {
            0% { transform: translate(-50%, 0); opacity: 0; }
            30% { transform: translate(-50%, -25px); opacity: 1; }
            100% { transform: translate(-50%, -45px); opacity: 0; }
          }
        `}
      </style>

      <div className="w-full max-w-3xl rounded-lg p-6 relative max-h-screen overflow-hidden">
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold">오늘 식사는 어떠셨나요?</h1>
        </div>

        {isLoading ? (
          <div className="text-center py-8">로딩 중...</div>
        ) : error ? (
          <div className="text-center text-red-500 py-8">{error}</div>
        ) : (
          <>
            <div className="flex flex-col items-center justify-center">
              <div className="w-full max-w-xl space-y-6 overflow-hidden">
                {todayMenus.map((menu) => (
                  <div
                    key={menu.id}
                    className={`bg-white/50 rounded-2xl p-3 ${
                      isClosed ? 'opacity-70' : ''
                    } relative`}
                  >
                    <div className="flex justify-between items-center mb-2 my-1 mx-4">
                      <h2 className="text-lg font-semibold">{menu.name}</h2>
                      <div className="text-sm text-gray-500">투표: {menu.votes}명</div>
                    </div>
                    <div className="relative">
                      <div className="flex justify-between px-2">
                        {satisfactionLevels.map((level) => (
                          <div
                            key={level.id}
                            className={`flex flex-col items-center w-16 cursor-pointer`}
                            onClick={() => {
                              if (!isClosed) handleSatisfactionChange(menu.id, level.value);
                            }}
                          >
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                                menu.satisfaction === level.value
                                  ? 'bg-red-500 border-red-600 shadow-md'
                                  : 'bg-white border-2 border-gray-400'
                              }`}
                            >
                              {menu.satisfaction === level.value && (
                                <span className="absolute inline-flex h-2 w-2 rounded-full bg-red-400 opacity-75"></span>
                              )}
                            </div>
                            <span
                              className={`mt-2 text-sm text-center ${
                                menu.satisfaction === level.value
                                  ? 'font-bold text-red-500'
                                  : 'text-gray-700'
                              }`}
                            >
                              {level.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 여러 애니메이션을 동시에 표시 */}
                    {animatingVotes
                      .filter((anim) => anim.menuId === menu.id)
                      .map((anim) => (
                        <VoteAnimation
                          key={anim.id}
                          selectedValue={anim.value}
                          onComplete={() => handleAnimationComplete(anim.id)}
                        />
                      ))}
                  </div>
                ))}

                {isClosed && (
                  <div className="p-4 bg-red-100 text-red-700 rounded-lg mt-4">
                    <p className="font-bold">만족도 조사가 마감되었습니다.</p>
                    <p>오늘 총 {totalVotes}명이 참여했습니다. 감사합니다!</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* 마감 확인 모달 */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">만족도 조사 마감</h3>
            <p className="mb-6">
              정말로 오늘의 만족도 조사를 마감하시겠습니까?
              <br />
              마감 후에는 더 이상 참여가 불가능합니다.
            </p>
            <div className="flex justify-end space-x-4">
              <Button
                className="px-4 py-2 bg-gray-200 hover:bg-gray-400 text-gray-800 rounded"
                onClick={() => setShowConfirmation(false)}
              >
                취소
              </Button>
              <Button
                className="px-4 py-2 bg-red-400 hover:bg-red-600 text-gray-800 rounded"
                onClick={handleClose}
              >
                마감하기
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SatisfactionSurvey;
