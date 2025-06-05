import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/button';
import InputCard from '../../components/ui/inputcard';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../utils/apiClient';
import API_CONFIG from '../../config/api';
import { showErrorAlert, showSuccessAlert } from '../../utils/sweetalert';

const MyPage: React.FC = () => {
  const { logout, accessToken } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // 사용자 데이터로 초기화
  const [formData, setFormData] = useState({
    loginId: '',
    password: '',
    confirmPassword: '',
    nutritionistName: '',
    city: '',
    schoolName: '',
  });

  // 도시 및 학교 데이터
  const [cities, setCities] = useState<string[]>([]);
  const [schools, setSchools] = useState<string[]>([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showSchoolDropdown, setShowSchoolDropdown] = useState(false);
  const [isLoadingSchools, setIsLoadingSchools] = useState(false);
  const [shouldFetchSchools, setShouldFetchSchools] = useState(false);

  // 드롭다운 외부 클릭 감지를 위한 ref
  const cityInputRef = useRef<HTMLDivElement>(null);
  const schoolInputRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();

  // 외부 클릭 감지 이벤트 리스너
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cityInputRef.current && !cityInputRef.current.contains(event.target as Node)) {
        setShowCityDropdown(false);
      }
      if (schoolInputRef.current && !schoolInputRef.current.contains(event.target as Node)) {
        setShowSchoolDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 도시 목록 가져오기
  useEffect(() => {
    fetchCities();
  }, []);

  // 학교 검색 - 도시나 학교 이름이 변경될 때 실행
  useEffect(() => {
    if (formData.city && formData.schoolName.length > 0 && shouldFetchSchools) {
      // API 요청 디바운스 - 타이핑 중에 너무 많은 요청을 보내지 않도록
      const debounceTimeout = setTimeout(() => {
        fetchSchools();
      }, 300); // 300ms 디바운스

      return () => clearTimeout(debounceTimeout);
    } else if (!shouldFetchSchools) {
      // shouldFetchSchools가 false일 때는 드롭다운을 열지 않음
      setShowSchoolDropdown(false);
    } else {
      setSchools([]);
      setShowSchoolDropdown(false);
    }
  }, [formData.city, formData.schoolName, shouldFetchSchools]);

  // 사용자 정보 로드
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!accessToken) {
        return;
      }

      try {
        setIsDataLoading(true);

        // apiClient 사용 - 이미 내부적으로 응답을 처리함
        const userData = await apiClient.get(API_CONFIG.ENDPOINTS.AUTH.MYPAGE);

        // userData가 있으면 폼 데이터 설정
        if (userData) {
          setFormData({
            loginId: userData.loginId || '',
            password: '',
            confirmPassword: '',
            nutritionistName: userData.nutritionistName || '',
            city: userData.city || '',
            schoolName: userData.schoolName || '',
          });
        }
      } catch {
        // 에러 처리는 유지
      } finally {
        setIsDataLoading(false);
      }
    };

    if (accessToken) {
      fetchUserInfo();
    } else {
      setIsDataLoading(false);
    }
  }, [accessToken]);

  // 도시 목록 가져오기
  const fetchCities = async () => {
    try {
      const response = await fetch(API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.SCHOOL.CITIES));

      if (!response.ok) {
        throw new Error(`서버 오류: ${response.status}`);
      }

      const data = await response.json();

      // 백엔드 응답 형식에 맞게 처리
      if (Array.isArray(data)) {
        setCities(data);
      } else {
        // 응답이 객체일 경우 cities 배열 추출
        setCities(data.cities || []);
      }
    } catch {
      // 에러 처리는 유지
    }
  };

  // 학교 검색
  const fetchSchools = async () => {
    if (!formData.city || formData.schoolName.length === 0) {
      return;
    }

    setIsLoadingSchools(true);
    setShowSchoolDropdown(true); // 로딩 중에도 드롭다운 표시

    try {
      // 요청 파라미터 준비
      const params = {
        city: formData.city,
        schoolName: formData.schoolName,
      };

      // 쿼리 파라미터를 사용한 GET 요청 (백엔드 컨트롤러 @RequestParam에 맞춤)
      const apiUrl = API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.SCHOOL.SCHOOLS, params);

      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`서버 오류: ${response.status}`);
      }

      const data = await response.json();

      // 백엔드 응답 형식에 맞게 처리
      let schoolsList: string[] = [];

      if (data && Array.isArray(data.schools)) {
        // { schools: [...] } 형식의 응답
        schoolsList = data.schools;
      } else if (Array.isArray(data)) {
        // 배열 형식의 응답
        schoolsList = data;
      }

      // 상태 업데이트
      setSchools(schoolsList);
      setShowSchoolDropdown(schoolsList.length > 0);
    } catch {
      // 에러 처리는 유지
      setShowSchoolDropdown(false);
    } finally {
      setIsLoadingSchools(false);
    }
  };

  // 도시 선택 핸들러
  const handleCitySelect = (city: string) => {
    setFormData((prev) => ({
      ...prev,
      city,
      schoolName: '', // 도시가 변경되면 학교 이름 초기화
    }));
    setSchools([]); // 학교 목록 초기화
    setShowCityDropdown(false); // 도시 선택 시 드롭다운 닫기
  };

  // 학교 선택 핸들러
  const handleSchoolSelect = (school: string) => {
    setFormData((prev) => ({
      ...prev,
      schoolName: school,
    }));
    setShowSchoolDropdown(false);
    setShouldFetchSchools(false); // 학교를 선택한 후에는 자동 검색 비활성화
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // 학교명 입력 필드일 경우, 자동 검색 활성화
    if (name === 'schoolName') {
      setShouldFetchSchools(true);
    }
  };

  const handleUpdate = async () => {
    // 비밀번호 확인
    if (formData.password && formData.password !== formData.confirmPassword) {
      showErrorAlert('비밀번호가 일치하지 않습니다.');
      return;
    }

    // 토큰 확인
    if (!accessToken) {
      navigate('/login');
      return;
    }

    setIsLoading(true);

    try {
      // 필요한 데이터만 전송
      const updateData = {
        nutritionistName: formData.nutritionistName,
        city: formData.city,
        schoolName: formData.schoolName,
      };

      // 비밀번호가 입력된 경우에만 포함
      if (formData.password) {
        Object.assign(updateData, { password: formData.password });
      }

      // apiClient 사용
      await apiClient.put(API_CONFIG.ENDPOINTS.AUTH.MYPAGE, updateData);

      showSuccessAlert('회원 정보가 수정되었습니다.');
    } catch {
      showErrorAlert('회원 정보 수정에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!accessToken) {
      // 토큰이 없는 경우 로컬 상태만 초기화
      logout();
      navigate('/login');
      return;
    }

    try {
      setIsLoggingOut(true);

      // 로그아웃 API 호출
      await apiClient.delete(
        API_CONFIG.ENDPOINTS.AUTH.LOGOUT,
        {} // 빈 객체를 두 번째 인자로 전달
      );

      // 로그아웃 처리 (상태 초기화)
      logout();

      // 홈페이지로 이동
      navigate('/');
    } catch {
      // 오류가 발생해도 로컬 상태는 로그아웃 처리
      logout();
      navigate('/');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div
      className="
        min-h-screen
        flex items-center justify-center
        bg-mypage
        bg-cover
        bg-center
      "
    >
      <div className="w-full mt-10 max-w-sm space-y-5 h-[80%] mt-20">
        {isDataLoading ? (
          <div className="text-center py-8">정보를 불러오는 중...</div>
        ) : (
          <>
            <InputCard
              placeholder="이름을 입력하세요"
              name="nutritionistName"
              value={formData.nutritionistName}
              onChange={handleChange}
            />

            {/* 도시 선택 드롭다운 */}
            <div ref={cityInputRef} className="relative">
              <InputCard
                placeholder="지역을 선택하세요"
                name="city"
                value={formData.city}
                onChange={handleChange}
                onFocus={() => setShowCityDropdown(true)}
                readOnly
              />
              {showCityDropdown && cities.length > 0 && (
                <div
                  className="absolute z-10 w-full mt-1 bg-white border-2 border-white rounded-lg shadow-xl overflow-auto"
                  style={{
                    maxHeight: '180px', // 약 3개의 항목이 표시될 높이
                  }}
                >
                  {cities.map((city, index) => (
                    <div
                      key={index}
                      className="p-3 hover:bg-green-50 cursor-pointer border-b border-gray-100 font-medium"
                      style={{ height: '50px', display: 'flex', alignItems: 'center' }}
                      onClick={() => handleCitySelect(city)}
                    >
                      {city}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 학교 선택 드롭다운 */}
            <div ref={schoolInputRef} className="relative">
              <InputCard
                placeholder="학교명을 입력하세요"
                name="schoolName"
                value={formData.schoolName}
                onChange={handleChange}
                disabled={!formData.city}
                onFocus={() => formData.city && setShouldFetchSchools(true)}
              />
              {showSchoolDropdown && schools.length > 0 && (
                <div
                  className="absolute z-10 w-full mt-1 bg-white border-2 border-white rounded-lg shadow-xl overflow-auto"
                  style={{
                    maxHeight: '150px', // 약 3개의 항목이 표시될 높이 (각 항목 높이 약 56px)
                  }}
                >
                  {isLoadingSchools ? (
                    <div className="p-3 text-center text-gray-500">학교 검색 중...</div>
                  ) : (
                    schools.map((school, index) => (
                      <div
                        key={index}
                        className="p-3 hover:bg-green-50 cursor-pointer border-b border-gray-100 font-medium"
                        style={{ height: '53px', display: 'flex', alignItems: 'center' }}
                        onClick={() => handleSchoolSelect(school)}
                      >
                        {school}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <InputCard
              placeholder="아이디를 입력하세요"
              name="loginId"
              value={formData.loginId}
              onChange={handleChange}
              disabled // 아이디는 변경 불가능하도록 설정
            />

            <InputCard
              type="password"
              placeholder="비밀번호를 입력하세요"
              name="password"
              value={formData.password}
              onChange={handleChange}
            />

            <InputCard
              type="password"
              placeholder="비밀번호를 다시 입력하세요"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
            />

            <div className="flex justify-center gap-4">
              <Button
                className="w-full max-w-[200px] py-3 bg-white/50 hover:bg-red-500 hover:text-white"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? '로그아웃 중...' : '로그아웃'}
              </Button>
              <Button
                className="w-full max-w-[200px] py-3"
                onClick={handleUpdate}
                disabled={isLoading}
              >
                {isLoading ? '수정 중...' : '수정하기'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MyPage;
