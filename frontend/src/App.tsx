import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import React, { ReactNode } from 'react';
import LoginPage from './pages/Login/login';
import JoinPage from './pages/Join/join';
import MainPage from './pages/Main';
import Calendar from './pages/Calendar';
import Header from './components/Header';
import InventoryPage from './pages/Inventory';
import MyPage from './pages/MyPage';
import ForgotAccountPage from './pages/ForgotAccount';
import { useAuthStore } from './store/authStore';
import ProtectedRoute from './components/ProtectedRoute';
import SatisfactionSurvey from './pages/Survey';
import StudentManagement from './pages/Student';
import TaggingPage from './pages/TaggingPage';
import SweetAlertExample from './components/SweetAlertExample';

// 헤더를 포함하는 레이아웃 컴포넌트
const Layout = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <>
      <Header isLoggedIn={isAuthenticated} />
      <main className="w-full h-full">
        <Outlet />
      </main>
    </>
  );
};

// 인증이 필요없는 페이지를 위한 레이아웃 컴포넌트
const PublicLayout = () => {
  return (
    <>
      <Header isLoggedIn={false} />
      <main className="w-full h-full">
        <Outlet />
      </main>
    </>
  );
};

// 헤더가 없는 레이아웃 컴포넌트 (대시보드용)
const NoHeaderLayout = () => {
  return (
    <main className="w-full h-full">
      <Outlet />
    </main>
  );
};

// 이미 인증된 사용자의 로그인 페이지 접근 방지를 위한 인터페이스
interface RequireNoAuthProps {
  children: ReactNode;
}

// 이미 인증된 사용자의 로그인 페이지 접근 방지
const RequireNoAuth: React.FC<RequireNoAuthProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">로딩 중...</div>;
  }

  if (isAuthenticated) {
    return <Navigate to="/main" replace />;
  }

  return <>{children}</>;
};

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <BrowserRouter>
      <Routes>
        {/* 인증이 필요하지 않은 페이지들 */}
        <Route
          path="/login"
          element={
            <RequireNoAuth>
              <LoginPage />
            </RequireNoAuth>
          }
        />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/forgot" element={<ForgotAccountPage />} />
        <Route path="/survey" element={<SatisfactionSurvey />} />

        {/* 인증이 필요없는 공개 페이지 (헤더 포함) */}
        <Route element={<PublicLayout />}>
          <Route path="/tagging" element={<TaggingPage />} />
          <Route path="/alert-examples" element={<SweetAlertExample />} />
        </Route>

        {/* 인증이 필요한 경로들 */}
        <Route element={<ProtectedRoute />}>
          {/* 헤더가 있는 페이지들 */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/main" />} />
            <Route path="main" element={<MainPage />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="student" element={<StudentManagement />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="mypage" element={<MyPage />} />
          </Route>

          {/* 헤더가 없는 페이지들 */}
          <Route element={<NoHeaderLayout />}>
            <Route path="dashboard" element={<SatisfactionSurvey />} />
          </Route>
        </Route>

        {/* 기본 경로 리다이렉트 */}
        <Route path="*" element={<Navigate to={isAuthenticated ? '/main' : '/login'} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
