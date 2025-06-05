import API_CONFIG from '../config/api';
import { useAuthStore } from '../store/authStore';

/**
 * 토큰 유효성 검사 함수
 * 현재 액세스 토큰이 유효한지 확인하고, 유효하지 않으면 리프레시 토큰으로 갱신 시도
 * @returns {Promise<boolean>} 토큰이 유효하거나 갱신 성공 시 true, 실패 시 false
 */
export const validateToken = async (): Promise<boolean> => {
  const authStore = useAuthStore.getState();
  const { accessToken } = authStore;

  // 토큰이 없으면 바로 false 반환
  if (!accessToken) {
    return false;
  }

  try {
    // 토큰 유효성 검사 요청
    const response = await fetch(API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.AUTH.VALIDATE_TOKEN), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    // 토큰이 유효하면 true 반환
    if (response.ok) {
      return true;
    }

    // 토큰이 유효하지 않으면 리프레시 토큰으로 갱신 시도
    if (response.status === 401) {
      return await authStore.refreshToken();
    }

    return false;
  } catch {
    return false;
  }
};

/**
 * 토큰 갱신 실패 시 로그아웃 처리 함수
 * 토큰이 유효하지 않고 갱신도 실패한 경우 호출
 */
export const handleAuthFailure = async (): Promise<void> => {
  const authStore = useAuthStore.getState();

  // 로컬 스토리지와 zustand 스토어에서 인증 정보 삭제
  await authStore.logout();

  // 로그인 페이지로 리다이렉트
  window.location.href = '/login';
};
