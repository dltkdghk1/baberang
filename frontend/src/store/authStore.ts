import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import API_CONFIG from '../config/api';

interface User {
  userPk: number;
  loginId: string;
  nutritionistName: string;
  city: string;
  schoolName: string;
}

interface AuthState {
  accessToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // 액션
  login: (credentials: { loginId: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  initializeAuth: () => Promise<void>;
  setUserData: (userData: User) => void;
  validateCurrentToken: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (credentials) => {
        set({ isLoading: true });
        try {
          const response = await fetch(API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.AUTH.LOGIN), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
            credentials: 'include', // 쿠키 포함
          });

          // 응답이 성공적이지 않은 경우
          if (!response.ok) {
            // 실패 시 로딩 상태 해제
            set({ isLoading: false });

            let errorMessage = '로그인에 실패했습니다.';

            try {
              const errorData = await response.json();
              errorMessage = errorData.message || '아이디 또는 비밀번호가 올바르지 않습니다.';
            } catch {
              // JSON 파싱 실패 시 HTTP 상태 코드에 따른 메시지 설정
              if (response.status === 400) {
                errorMessage = '아이디 또는 비밀번호가 올바르지 않습니다.';
              } else if (response.status === 401) {
                errorMessage = '인증에 실패했습니다. 다시 로그인해주세요.';
              } else if (response.status === 404) {
                errorMessage = '계정을 찾을 수 없습니다.';
              } else if (response.status >= 500) {
                errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
              }
            }

            throw new Error(errorMessage);
          }

          const accessToken = response.headers.get('Authorization');
          const userData = await response.json();

          // 토큰이 있고, Bearer 접두사가 없는 경우에만 추가
          const formattedToken = accessToken
            ? accessToken.startsWith('Bearer ')
              ? accessToken
              : `Bearer ${accessToken}`
            : null;

          set({
            accessToken: formattedToken,
            user: userData,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          const token = get().accessToken;
          if (!token) return; // 토큰이 없으면 API 호출 안함
          
          await fetch(API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.AUTH.LOGOUT), {
            method: 'DELETE',
            headers: {
              Authorization: token, // Bearer 접두사 포함된 형태 그대로 전송
            },
            credentials: 'include',
            });
          } finally {
            set({ accessToken: null, user: null, isAuthenticated: false });
          }
        },

      // 토큰 리프레시 함수
      refreshToken: async () => {
        try {
          const response = await fetch(API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.AUTH.REFRESH_TOKEN), {
            method: 'POST',
            credentials: 'include',
          });

          if (!response.ok) {
            return false;
          }

          // 여러 헤더 이름을 시도
          const accessToken =
            response.headers.get('accessToken') ||
            response.headers.get('Authorization') ||
            response.headers.get('Access-Token') ||
            response.headers.get('access-token');

          // 토큰 갱신 성공 시 인증 상태도 함께 업데이트
          if (accessToken) {
            // Bearer 접두사 추가 포맷팅
            const formattedToken = accessToken.startsWith('Bearer ')
              ? accessToken
              : `Bearer ${accessToken}`;

            set({
              accessToken: formattedToken,
              isAuthenticated: true,
            });
            return true;
          }

          // 토큰은 응답 본문에 있을 수도 있음
          try {
            const data = await response.json();

            if (data.accessToken || data.token) {
              const token = data.accessToken || data.token;
              const formattedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

              set({
                accessToken: formattedToken,
                isAuthenticated: true,
              });
              return true;
            }
          } catch {
            // 응답 본문 처리 중 오류가 있어도 무시
          }

          return false;
        } catch {
          return false;
        }
      },

      // 토큰 유효성 검사 함수
      validateCurrentToken: async () => {
        const token = get().accessToken;

        if (!token) {
          return false;
        }

        try {
          const response = await fetch(
            API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.AUTH.VALIDATE_TOKEN),
            {
              method: 'GET',
              headers: {
                Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              credentials: 'include',
            }
          );

          if (response.ok) {
            return true;
          }

          // 토큰이 유효하지 않으면 리프레시 토큰으로 갱신 시도
          if (response.status === 401) {
            return await get().refreshToken();
          }

          return false;
        } catch {
          return false;
        }
      },

      // 인증 초기화 함수
      initializeAuth: async () => {
        const currentToken = get().accessToken;
        set({ isLoading: true });

        try {
          // 토큰이 있는 경우
          if (currentToken) {
            // 토큰 유효성 검사
            const isValid = await get().validateCurrentToken();

            // 토큰이 유효하거나 갱신 성공한 경우만 사용자 정보 가져오기
            if (isValid) {
              // 갱신된 새 토큰 가져오기 (validateCurrentToken 호출 후 변경되었을 수 있음)
              const newToken = get().accessToken;

              try {
                const response = await fetch(API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.AUTH.MYPAGE), {
                  method: 'GET',
                  headers: {
                    Authorization: newToken?.startsWith('Bearer ')
                      ? newToken
                      : `Bearer ${newToken}`,
                  },
                  credentials: 'include',
                });

                if (response.ok) {
                  const userData = await response.json();
                  set({ user: userData, isAuthenticated: true });
                } else {
                  // 사용자 정보 가져오기 실패 시 로그아웃
                  await get().logout();
                }
              } catch {
                // 사용자 정보 가져오기 오류 시 로그아웃
                await get().logout();
              }
            } else {
              // 토큰 갱신 실패시 로그아웃
              await get().logout();
            }
          } else {
            set({ isAuthenticated: false });
          }
        } catch {
          await get().logout();
        } finally {
          set({ isLoading: false });
        }
      },

      // 사용자 데이터 설정 함수
      setUserData: (userData) => {
        set({ user: userData });
      },
    }),
    {
      name: 'auth-storage',
      // localStorage에 저장할 상태 필드 지정 - 토큰, 사용자 정보, 인증 상태 모두 저장
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
