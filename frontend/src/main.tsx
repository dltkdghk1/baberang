import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { useAuthStore } from './store/authStore';

// 앱 실행 전에 인증 상태 초기화
const initAuth = async () => {
  const initializeAuth = useAuthStore.getState().initializeAuth;
  await initializeAuth();
};

// 인증 초기화 후 앱 렌더링
initAuth().then(() => {
  createRoot(document.getElementById('root')!).render(<App />);
});
