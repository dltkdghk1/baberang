import { Navigate, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';

/**
 * 인증이 필요한 라우트를 보호하는 컴포넌트
 * 인증되지 않은 사용자는 로그인 페이지로 리다이렉트
 */
const ProtectedRoute = () => {
  const { isAuthenticated, isLoading, validateCurrentToken, initializeAuth, accessToken } =
    useAuthStore();
  const [checking, setChecking] = useState(true);

  // 인증 상태 확인
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        // 이미 인증된 상태이고 토큰이 있는 경우 토큰 유효성 검사
        if (isAuthenticated && accessToken) {
          const isValid = await validateCurrentToken();

          if (isValid) {
            setChecking(false);
            return;
          }
        }

        // 초기화 함수 호출 (localStorage에서 토큰 복원 및 검증)
        await initializeAuth();
      } finally {
        setChecking(false);
      }
    };

    verifyAuth();
  }, [isAuthenticated, validateCurrentToken, initializeAuth, accessToken]);

  // 인증 상태 확인 중이거나 앱 로딩 중인 경우
  if (isLoading || checking) {
    return <div className="flex justify-center items-center h-screen">로딩 중...</div>;
  }

  // 인증되지 않은 경우 로그인 페이지로 리다이렉트
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 인증된 경우 자식 컴포넌트 렌더링
  return <Outlet />;
};

export default ProtectedRoute;
