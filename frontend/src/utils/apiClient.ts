import API_CONFIG from '../config/api';
import { useAuthStore } from '../store/authStore';

// API 요청을 처리하는 클라이언트
class ApiClient {
  // API 요청 메서드 (GET, POST, PUT, DELETE 등을 처리)
  async request(endpoint: string, options: RequestInit = {}) {
    const url = API_CONFIG.getUrl(endpoint);
    const authStore = useAuthStore.getState();
    const { accessToken } = authStore;

    // 기본 헤더 설정
    const headers = new Headers({
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    });

    // 인증 토큰이 있으면 헤더에 추가
    if (accessToken) {
      // 토큰 형식 확인 및 처리 (Bearer 접두사 중복 방지)
      const authHeaderValue = accessToken.startsWith('Bearer ')
        ? accessToken
        : `Bearer ${accessToken}`;
      headers.set('Authorization', authHeaderValue);
    }

    // 요청 옵션 구성
    const requestOptions: RequestInit = {
      ...options,
      headers,
      credentials: 'include', // 쿠키 포함
    };

    try {
      // 요청 실행
      let response = await fetch(url, requestOptions);

      // 401 Unauthorized 에러 처리 (토큰 만료)
      if (response.status === 401) {
        const refreshSuccess = await authStore.refreshToken();

        // 토큰 갱신 성공 시 원래 요청 재시도
        if (refreshSuccess) {
          // 갱신된 토큰으로 헤더 업데이트
          const newToken = useAuthStore.getState().accessToken;
          if (newToken) {
            const authHeaderValue = newToken.startsWith('Bearer ')
              ? newToken
              : `Bearer ${newToken}`;
            headers.set('Authorization', authHeaderValue);
          }
          requestOptions.headers = headers;
          response = await fetch(url, requestOptions);
        } else {
          // 토큰 갱신 실패 시 로그아웃
          await authStore.logout();
          throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
        }
      }

      // 응답이 OK가 아니면 에러 처리
      if (!response.ok) {
        throw new Error('API 요청 실패');
      }

      // 응답 데이터 반환
      if (response.headers.get('content-type')?.includes('application/json')) {
        return await response.json();
      }

      return await response.text();
    } catch {
      throw new Error('API 요청 오류');
    }
  }

  // GET 요청
  async get(endpoint: string, options: RequestInit = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  // POST 요청
  async post<T>(endpoint: string, data: T, options: RequestInit = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // PUT 요청
  async put<T>(endpoint: string, data: T, options: RequestInit = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // DELETE 요청
  async delete(endpoint: string, options: RequestInit = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

export default new ApiClient();
