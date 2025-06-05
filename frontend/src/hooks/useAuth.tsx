import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { AxiosError } from 'axios';

/**
 * 인증 관련 기능을 제공하는 커스텀 훅
 * - 로그인, 로그아웃 기능
 * - 로딩 상태 관리
 * - 에러 처리
 * - 페이지 이동 처리
 */
const useAuth = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const { login, logout, isAuthenticated, isLoading, user } = useAuthStore();

  /**
   * 로그인 처리 함수
   * @param credentials 로그인 자격 증명 (아이디, 비밀번호)
   * @param redirectPath 로그인 성공 후 리다이렉트할 경로 (기본값: '/main')
   */
  const handleLogin = async (
    credentials: { loginId: string; password: string },
    redirectPath = '/main'
  ) => {
    try {
      setError(null);
      await login(credentials);
      navigate(redirectPath);
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        // 백엔드에서 받은 에러 메시지를 설정
        const errorMessage =
          err.response?.data?.message || '로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.';
        setError(errorMessage);
        throw new Error(errorMessage);
      } else if (err instanceof Error) {
        setError(err.message);
        throw err;
      } else {
        const errorMessage = '알 수 없는 오류가 발생했습니다.';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    }
  };

  /**
   * 로그아웃 처리 함수
   * @param redirectPath 로그아웃 성공 후 리다이렉트할 경로 (기본값: '/login')
   */
  const handleLogout = async (redirectPath = '/login') => {
    try {
      await logout();
      navigate(redirectPath);
    } catch {
      // 오류가 발생해도 로그아웃은 진행
      navigate(redirectPath);
    }
  };

  /**
   * 인증 필요 페이지 접근 시 체크 함수
   * 인증되지 않은 경우 로그인 페이지로 리다이렉트
   */
  const checkAuth = () => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
      return false;
    }
    return true;
  };

  return {
    handleLogin,
    handleLogout,
    checkAuth,
    isAuthenticated,
    isLoading,
    user,
    error,
  };
};

export default useAuth;
