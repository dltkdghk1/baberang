import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/button';
import InputCard from '../../components/ui/inputcard';
import API_CONFIG from '../../config/api';
import Header from '../../components/Header';
import { showToast } from '../../utils/sweetalert';

type TabType = 'findId' | 'resetPassword';

const ForgotAccountPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('findId');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // 도시 및 학교 데이터
  const [cities, setCities] = useState<string[]>([]);
  const [schools, setSchools] = useState<string[]>([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showSchoolDropdown, setShowSchoolDropdown] = useState(false);
  const [isLoadingSchools, setIsLoadingSchools] = useState(false);

  // 드롭다운 외부 클릭 감지를 위한 ref
  const cityInputRef = useRef<HTMLDivElement>(null);
  const schoolInputRef = useRef<HTMLDivElement>(null);

  // 아이디 찾기 폼 상태
  const [findIdForm, setFindIdForm] = useState({
    nutritionistName: '',
    city: '',
    schoolName: '',
  });

  // 비밀번호 재설정 폼 상태
  const [resetPasswordForm, setResetPasswordForm] = useState({
    loginId: '',
    nutritionistName: '',
    city: '',
    schoolName: '',
    newPassword: '',
    confirmPassword: '',
  });

  // 컴포넌트 마운트 시 도시 목록 가져오기
  useEffect(() => {
    fetchCities();
  }, []);

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
        setCities(data.cities || []);
      }
    } catch {
      // err
    }
  };

  // 학교 검색
  const fetchSchools = async (city: string, schoolName: string) => {
    if (!city || !schoolName || schoolName.length === 0) {
      setSchools([]);
      setShowSchoolDropdown(false);
      return;
    }

    setIsLoadingSchools(true);
    setShowSchoolDropdown(true);

    try {
      const params = {
        city: city,
        schoolName: schoolName,
      };

      const apiUrl = API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.SCHOOL.SCHOOLS, params);
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`서버 오류: ${response.status}`);
      }

      const data = await response.json();

      let schoolsList: string[] = [];
      if (data && Array.isArray(data.schools)) {
        schoolsList = data.schools;
      } else if (Array.isArray(data)) {
        schoolsList = data;
      }

      setSchools(schoolsList);
      setShowSchoolDropdown(schoolsList.length > 0);
    } catch {
      setShowSchoolDropdown(false);
    } finally {
      setIsLoadingSchools(false);
    }
  };

  // 아이디 찾기 폼에서 학교 검색
  useEffect(() => {
    if (activeTab === 'findId' && findIdForm.city && findIdForm.schoolName.length > 0) {
      const debounceTimeout = setTimeout(() => {
        fetchSchools(findIdForm.city, findIdForm.schoolName);
      }, 300);

      return () => clearTimeout(debounceTimeout);
    }
  }, [activeTab, findIdForm.city, findIdForm.schoolName]);

  // 비밀번호 재설정 폼에서 학교 검색
  useEffect(() => {
    if (
      activeTab === 'resetPassword' &&
      resetPasswordForm.city &&
      resetPasswordForm.schoolName.length > 0
    ) {
      const debounceTimeout = setTimeout(() => {
        fetchSchools(resetPasswordForm.city, resetPasswordForm.schoolName);
      }, 300);

      return () => clearTimeout(debounceTimeout);
    }
  }, [activeTab, resetPasswordForm.city, resetPasswordForm.schoolName]);

  // 입력 필드 변경 핸들러 - 아이디 찾기
  const handleFindIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFindIdForm((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  // 도시 드롭다운 표시 함수 - 아이디 찾기
  const handleShowFindIdCityDropdown = () => {
    setShowCityDropdown(true);
    setActiveTab('findId');
  };

  // 학교 드롭다운 포커스 함수 - 아이디 찾기
  const handleFindIdSchoolFocus = () => {
    if (findIdForm.city) {
      setShowSchoolDropdown(true);
      fetchSchools(findIdForm.city, findIdForm.schoolName);
    }
  };

  // 도시 선택 핸들러 - 아이디 찾기
  const handleFindIdCitySelect = (city: string) => {
    setFindIdForm((prev) => ({
      ...prev,
      city,
      schoolName: '',
    }));
    setSchools([]);
    setShowCityDropdown(false);
  };

  // 학교 선택 핸들러 - 아이디 찾기
  const handleFindIdSchoolSelect = (school: string) => {
    setFindIdForm((prev) => ({
      ...prev,
      schoolName: school,
    }));
    setShowSchoolDropdown(false);
  };

  // 입력 필드 변경 핸들러 - 비밀번호 재설정
  const handleResetPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setResetPasswordForm((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  // 도시 드롭다운 표시 함수 - 비밀번호 재설정
  const handleShowResetPasswordCityDropdown = () => {
    setShowCityDropdown(true);
    setActiveTab('resetPassword');
  };

  // 학교 드롭다운 포커스 함수 - 비밀번호 재설정
  const handleResetPasswordSchoolFocus = () => {
    if (resetPasswordForm.city) {
      setShowSchoolDropdown(true);
      fetchSchools(resetPasswordForm.city, resetPasswordForm.schoolName);
    }
  };

  // 도시 선택 핸들러 - 비밀번호 재설정
  const handleResetPasswordCitySelect = (city: string) => {
    setResetPasswordForm((prev) => ({
      ...prev,
      city,
      schoolName: '',
    }));
    setSchools([]);
    setShowCityDropdown(false);
  };

  // 학교 선택 핸들러 - 비밀번호 재설정
  const handleResetPasswordSchoolSelect = (school: string) => {
    setResetPasswordForm((prev) => ({
      ...prev,
      schoolName: school,
    }));
    setShowSchoolDropdown(false);
  };

  // 아이디 찾기 제출
  const handleFindIdSubmit = async () => {
    // 필수 필드 검증
    if (!findIdForm.nutritionistName || !findIdForm.city || !findIdForm.schoolName) {
      setError('모든 필드를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // API 요청 준비
      const findIdUrl = API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.AUTH.FIND_ID);

      // 백엔드로 요청 전송
      const response = await fetch(findIdUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(findIdForm),
      });

      if (!response.ok) {
        throw new Error(`서버 오류: ${response.status}`);
      }

      const data = await response.json();

      showToast(`아이디: ${data.loginId}`, 'info');
    } catch {
      setError('입력한 정보와 일치하는 계정을 찾을 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 비밀번호 재설정 제출
  const handleResetPasswordSubmit = async () => {
    // 필수 필드 검증
    const { loginId, nutritionistName, city, schoolName, newPassword, confirmPassword } =
      resetPasswordForm;

    if (!loginId || !nutritionistName || !city || !schoolName || !newPassword) {
      setError('모든 필드를 입력해주세요.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // 비밀번호 확인은 제외하고 API에 전송할 데이터 준비
      const requestData = {
        loginId,
        nutritionistName,
        city,
        schoolName,
        newPassword,
      };

      const resetPasswordUrl = API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.AUTH.NEW_PASSWORD);

      // 백엔드로 요청 전송
      const response = await fetch(resetPasswordUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(`서버 오류: ${response.status}`);
      }

      // 결과 설정
      showToast('비밀번호가 성공적으로 재설정되었습니다.', 'success');
      // 폼 초기화
      setResetPasswordForm({
        loginId: '',
        nutritionistName: '',
        city: '',
        schoolName: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch {
      setError('입력한 정보와 일치하는 계정을 찾을 수 없거나 비밀번호 재설정에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Header isLoggedIn={false} />
      <div
        className="
          min-h-screen
          flex items-center justify-center
          bg-join
          bg-cover
          bg-center
          relative
        "
      >
        <div className="w-full max-w-sm space-y-6 relative z-50">
          {/* <h1 className="text-4xl font-semibold text-gray-700 text-center mb-6">
            {activeTab === 'findId' ? '아이디 찾기' : '비밀번호 재설정'}
          </h1> */}

          {/* 탭 전환 버튼 */}
          <div className="flex border-b border-gray-300 mb-6 relative z-50">
            <button
              className={`flex-1 py-3 font-medium cursor-pointer relative ${
                activeTab === 'findId'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-gray-500 hover:text-green-500'
              }`}
              onClick={() => setActiveTab('findId')}
              type="button"
            >
              아이디 찾기
            </button>
            <button
              className={`flex-1 py-3 font-medium cursor-pointer relative ${
                activeTab === 'resetPassword'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-gray-500 hover:text-green-500'
              }`}
              onClick={() => setActiveTab('resetPassword')}
              type="button"
            >
              비밀번호 재설정
            </button>
          </div>

          {/* 아이디 찾기 폼 */}
          {activeTab === 'findId' && (
            <div className="space-y-4">
              <InputCard
                placeholder="영양사 이름을 입력하세요"
                name="nutritionistName"
                value={findIdForm.nutritionistName}
                onChange={handleFindIdChange}
              />

              <div ref={cityInputRef} className="relative">
                <InputCard
                  placeholder="도시를 선택하세요"
                  name="city"
                  value={findIdForm.city}
                  onChange={handleFindIdChange}
                  onFocus={handleShowFindIdCityDropdown}
                  readOnly
                />
                {showCityDropdown && activeTab === 'findId' && cities.length > 0 && (
                  <div
                    className="absolute z-10 w-full mt-1 bg-white border-2 border-white rounded-lg shadow-xl overflow-auto"
                    style={{
                      maxHeight: '180px',
                    }}
                  >
                    {cities.map((city, index) => (
                      <div
                        key={index}
                        className="p-3 hover:bg-green-50 cursor-pointer border-b border-gray-100 font-medium"
                        style={{ height: '50px', display: 'flex', alignItems: 'center' }}
                        onClick={() => handleFindIdCitySelect(city)}
                      >
                        {city}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div ref={schoolInputRef} className="relative">
                <InputCard
                  placeholder="학교 이름을 입력하세요"
                  name="schoolName"
                  value={findIdForm.schoolName}
                  onChange={handleFindIdChange}
                  onFocus={handleFindIdSchoolFocus}
                  disabled={!findIdForm.city}
                />
                {showSchoolDropdown && activeTab === 'findId' && schools.length > 0 && (
                  <div
                    className="absolute z-10 w-full mt-1 bg-white border-2 border-white rounded-lg shadow-xl overflow-auto"
                    style={{
                      maxHeight: '150px',
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
                          onClick={() => handleFindIdSchoolSelect(school)}
                        >
                          {school}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {error && <div className="text-red-500 text-sm text-center">{error}</div>}

              <div className="flex justify-center gap-4 mt-6">
                <Button
                  className="w-full max-w-[200px] py-3 bg-white/50 hover:bg-green-500 hover:text-white"
                  onClick={() => navigate('/login')}
                  disabled={isLoading}
                >
                  취소
                </Button>
                <Button
                  className="w-full max-w-[200px] py-3"
                  onClick={handleFindIdSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? '처리 중...' : '아이디 찾기'}
                </Button>
              </div>
            </div>
          )}

          {/* 비밀번호 재설정 폼 */}
          {activeTab === 'resetPassword' && (
            <div className="space-y-4">
              <InputCard
                placeholder="아이디를 입력하세요"
                name="loginId"
                value={resetPasswordForm.loginId}
                onChange={handleResetPasswordChange}
              />
              <InputCard
                placeholder="영양사 이름을 입력하세요"
                name="nutritionistName"
                value={resetPasswordForm.nutritionistName}
                onChange={handleResetPasswordChange}
              />

              <div ref={cityInputRef} className="relative">
                <InputCard
                  placeholder="도시를 선택하세요"
                  name="city"
                  value={resetPasswordForm.city}
                  onChange={handleResetPasswordChange}
                  onFocus={handleShowResetPasswordCityDropdown}
                  readOnly
                />
                {showCityDropdown && activeTab === 'resetPassword' && cities.length > 0 && (
                  <div
                    className="absolute z-10 w-full mt-1 bg-white border-2 border-white rounded-lg shadow-xl overflow-auto"
                    style={{
                      maxHeight: '180px',
                    }}
                  >
                    {cities.map((city, index) => (
                      <div
                        key={index}
                        className="p-3 hover:bg-green-50 cursor-pointer border-b border-gray-100 font-medium"
                        style={{ height: '50px', display: 'flex', alignItems: 'center' }}
                        onClick={() => handleResetPasswordCitySelect(city)}
                      >
                        {city}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div ref={schoolInputRef} className="relative">
                <InputCard
                  placeholder="학교 이름을 입력하세요"
                  name="schoolName"
                  value={resetPasswordForm.schoolName}
                  onChange={handleResetPasswordChange}
                  onFocus={handleResetPasswordSchoolFocus}
                  disabled={!resetPasswordForm.city}
                />
                {showSchoolDropdown && activeTab === 'resetPassword' && schools.length > 0 && (
                  <div
                    className="absolute z-10 w-full mt-1 bg-white border-2 border-white rounded-lg shadow-xl overflow-auto"
                    style={{
                      maxHeight: '150px',
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
                          onClick={() => handleResetPasswordSchoolSelect(school)}
                        >
                          {school}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <InputCard
                type="password"
                placeholder="새 비밀번호를 입력하세요"
                name="newPassword"
                value={resetPasswordForm.newPassword}
                onChange={handleResetPasswordChange}
              />
              <InputCard
                type="password"
                placeholder="새 비밀번호를 다시 입력하세요"
                name="confirmPassword"
                value={resetPasswordForm.confirmPassword}
                onChange={handleResetPasswordChange}
              />

              {error && <div className="text-red-500 text-sm text-center">{error}</div>}

              <div className="flex justify-center gap-4 mt-6">
                <Button
                  className="w-full max-w-[200px] py-3 bg-white/50 hover:bg-green-500 hover:text-white"
                  onClick={() => navigate('/login')}
                  disabled={isLoading}
                >
                  취소
                </Button>
                <Button
                  className="w-full max-w-[200px] py-3"
                  onClick={handleResetPasswordSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? '처리 중...' : '비밀번호 재설정'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ForgotAccountPage;
