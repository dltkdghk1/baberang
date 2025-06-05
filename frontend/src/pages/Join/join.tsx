import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/button';
import InputCard from '../../components/ui/inputcard';
import API_CONFIG from '../../config/api';
import { showErrorAlert, showSuccessAlert, showToast } from '../../utils/sweetalert';

const JoinPage: React.FC = () => {
  // 사용자 입력값 상태
  const [formData, setFormData] = useState({
    loginId: '',
    password: '',
    confirmPassword: '',
    nutritionistName: '',
    city: '',
    schoolName: '',
  });

  // 유효성 검사 및 오류 메시지
  const [errors, setErrors] = useState({
    loginId: '',
    password: '',
    confirmPassword: '',
    nutritionistName: '',
    city: '',
    schoolName: '',
  });

  // 아이디 중복 확인 상태
  const [idCheckLoading, setIdCheckLoading] = useState(false);
  const [idChecked, setIdChecked] = useState(false);

  // 도시 및 학교 데이터
  const [cities, setCities] = useState<string[]>([]);
  const [schools, setSchools] = useState<string[]>([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showSchoolDropdown, setShowSchoolDropdown] = useState(false);
  const [isLoadingSchools, setIsLoadingSchools] = useState(false);

  // 드롭다운 외부 클릭 감지를 위한 ref
  const cityInputRef = useRef<HTMLDivElement>(null);
  const schoolInputRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();

  // 컴포넌트 마운트 시 도시 목록 가져오기 및 아이디 입력칸 포커스
  useEffect(() => {
    fetchCities();

    // 아이디 입력 필드에 자동 포커스
    const loginIdInput = document.getElementById('loginId-input');
    if (loginIdInput) {
      loginIdInput.focus();
    }
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

  // 학교 검색 - 도시나 학교 이름이 변경될 때 실행
  useEffect(() => {
    if (formData.city && formData.schoolName.length > 0) {
      // API 요청 디바운스 - 타이핑 중에 너무 많은 요청을 보내지 않도록
      const debounceTimeout = setTimeout(() => {
        fetchSchools();
      }, 300); // 300ms 디바운스

      return () => clearTimeout(debounceTimeout);
    } else {
      setSchools([]);
      setShowSchoolDropdown(false);
    }
  }, [formData.city, formData.schoolName]);

  // 도시 목록 가져오기
  const fetchCities = async () => {
    try {
      const response = await fetch(API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.SCHOOL.CITIES));

      if (!response.ok) {
        throw new Error(`서버 오류: ${response.status}`);
      }

      const data = await response.json();

      // 백엔드 응답 형식에 맞게 처리 (사진에 보이는 cities 배열)
      if (Array.isArray(data)) {
        setCities(data);
      } else {
        // 응답이 객체일 경우 cities 배열 추출
        setCities(data.cities || []);
      }
    } catch {
      // 오류 처리
    }
  };

  // 학교 검색
  const fetchSchools = async () => {
    if (!formData.city || formData.schoolName.length === 0) {
      return;
    }

    // 학교 검색 시작 시 에러 메시지 제거
    setErrors((prev) => ({
      ...prev,
      schoolName: '',
    }));

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

      // 응답 데이터 파싱
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
      setShowSchoolDropdown(false);
    } finally {
      setIsLoadingSchools(false);
    }
  };

  // 입력 필드 변경 핸들러
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // 아이디 필드가 변경되면 중복 확인 상태 초기화
    if (name === 'loginId' && idChecked) {
      setIdChecked(false);
    }

    // 폼 데이터 업데이트
    setFormData((prev) => {
      const newData = {
        ...prev,
        [name]: value,
      };

      return newData;
    });

    // 사용자가 입력을 시작하면 항상 해당 필드의 오류 메시지 초기화
    setErrors((prev) => ({
      ...prev,
      [name]: '',
    }));
  };

  // 도시 드롭다운 표시 함수
  const handleShowCityDropdown = () => {
    setShowCityDropdown(true);
    // 도시 드롭다운을 열 때 에러 메시지 제거
    setErrors((prev) => ({
      ...prev,
      city: '',
    }));
  };

  // 학교 드롭다운 포커스 함수
  const handleSchoolFocus = () => {
    if (formData.city) {
      fetchSchools();
      // 학교 드롭다운을 열 때 에러 메시지 제거
      setErrors((prev) => ({
        ...prev,
        schoolName: '',
      }));
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

    // 도시 선택 시 에러 메시지 제거
    setErrors((prev) => ({
      ...prev,
      city: '',
    }));
  };

  // 학교 선택 핸들러
  const handleSchoolSelect = (school: string) => {
    setFormData((prev) => ({
      ...prev,
      schoolName: school,
    }));
    setShowSchoolDropdown(false);

    // 학교 선택 시 에러 메시지 제거
    setErrors((prev) => ({
      ...prev,
      schoolName: '',
    }));
  };

  // 아이디 중복 확인 함수
  const checkIdDuplicate = async () => {
    if (!formData.loginId || formData.loginId.length < 5) {
      setErrors((prev) => ({
        ...prev,
        loginId: '아이디는 최소 5자 이상이어야 합니다.',
      }));
      return;
    }

    setIdCheckLoading(true);

    try {
      // 아이디 중복 확인 API 호출
      const response = await fetch(API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.AUTH.VALIDATE_ID), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId: formData.loginId }),
      });

      // 응답이 HTML인지 확인
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        throw new Error('서버가 유효한 JSON 응답을 반환하지 않습니다');
      }

      if (!response.ok) {
        throw new Error(`서버 오류: ${response.status}`);
      }

      const data = await response.json();

      // 백엔드 응답 형식에 맞게 처리
      if (data.valid) {
        setIdChecked(true);
        showToast('사용 가능한 아이디입니다.');
      } else {
        setErrors((prev) => ({
          ...prev,
          loginId: '이미 사용 중인 아이디입니다.',
        }));
      }
    } catch {
      setErrors((prev) => ({
        ...prev,
        loginId: '중복 확인 중 오류가 발생했습니다.',
      }));
    } finally {
      setIdCheckLoading(false);
    }
  };

  // 폼 유효성 검사
  const validateForm = () => {
    let isValid = true;
    // 에러 메시지를 완전히 새로 설정
    const newErrors = {
      loginId: '',
      password: '',
      confirmPassword: '',
      nutritionistName: '',
      city: '',
      schoolName: '',
    };

    // 아이디 검사
    if (!formData.loginId) {
      newErrors.loginId = '아이디를 입력해주세요.';
      isValid = false;
    } else if (!idChecked) {
      newErrors.loginId = '아이디 중복 확인이 필요합니다.';
      isValid = false;
    }

    // 비밀번호 검사
    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요.';
      isValid = false;
    } else if (formData.password.length < 4) {
      newErrors.password = '비밀번호는 최소 4자 이상이어야 합니다.';
      isValid = false;
    }

    // 비밀번호 확인 검사
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다.';
      isValid = false;
    }

    // 영양사 이름 검사
    if (!formData.nutritionistName) {
      newErrors.nutritionistName = '영양사 이름을 입력해주세요.';
      isValid = false;
    }

    // 도시 검사
    if (!formData.city) {
      newErrors.city = '도시를 입력해주세요.';
      isValid = false;
    }

    // 학교 이름 검사
    if (!formData.schoolName) {
      newErrors.schoolName = '학교 이름을 입력해주세요.';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // 회원가입 처리
  const handleJoin = async () => {
    // 이전 에러 메시지 초기화
    setErrors({
      loginId: '',
      password: '',
      confirmPassword: '',
      nutritionistName: '',
      city: '',
      schoolName: '',
    });

    if (!validateForm()) {
      return;
    }

    try {
      // 요청 데이터 준비
      const requestData = {
        loginId: formData.loginId,
        password: formData.password,
        nutritionistName: formData.nutritionistName,
        city: formData.city,
        schoolName: formData.schoolName,
      };

      // 회원가입 API 호출
      const response = await fetch(API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.AUTH.SIGNUP), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(`서버 오류: ${response.status}`);
      }

      // 성공 시 로그인 페이지로 이동
      showSuccessAlert('회원가입이 완료되었습니다.');
      navigate('/login');
    } catch (error) {
      showErrorAlert(
        '회원가입 오류',
        error instanceof Error ? error.message : '회원가입 중 오류가 발생했습니다.'
      );
    }
  };

  return (
    <div
      className="
        min-h-screen
        flex items-center justify-center
        bg-join
        bg-cover
        bg-center
      "
    >
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-3xl font-semibold text-gray-700 text-center mb-5">회원가입</h1>

        <InputCard
          placeholder="아이디를 입력하세요"
          name="loginId"
          value={formData.loginId}
          onChange={handleChange}
          error={errors.loginId}
          showCheckButton
          onCheck={checkIdDuplicate}
          checkLoading={idCheckLoading}
          checked={idChecked}
          id="loginId-input"
        />

        <InputCard
          type="password"
          placeholder="비밀번호를 입력하세요"
          name="password"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
        />

        <InputCard
          type="password"
          placeholder="비밀번호를 다시 입력하세요"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
        />

        <InputCard
          placeholder="영양사 이름을 입력하세요"
          name="nutritionistName"
          value={formData.nutritionistName}
          onChange={handleChange}
          error={errors.nutritionistName}
        />

        <div ref={cityInputRef} className="relative">
          <InputCard
            placeholder="도시를 선택하세요"
            name="city"
            value={formData.city}
            onChange={(e) => {
              handleChange(e);
              // 입력 변경 시 에러 메시지 제거 확실히 하기
              setErrors((prev) => ({ ...prev, city: '' }));
            }}
            error={errors.city}
            onFocus={() => {
              handleShowCityDropdown();
              // 포커스 시 에러 메시지 제거 확실히 하기
              setErrors((prev) => ({ ...prev, city: '' }));
            }}
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
                  onClick={() => {
                    handleCitySelect(city);
                    // 도시 선택 시 에러 메시지 확실히 제거
                    setErrors((prev) => ({ ...prev, city: '' }));
                  }}
                >
                  {city}
                </div>
              ))}
            </div>
          )}
        </div>

        <div ref={schoolInputRef} className="mt-4 relative">
          <InputCard
            placeholder="학교 이름을 입력하세요"
            name="schoolName"
            value={formData.schoolName}
            onChange={(e) => {
              handleChange(e);
              // 입력 변경 시 에러 메시지 제거 확실히 하기
              setErrors((prev) => ({ ...prev, schoolName: '' }));
            }}
            error={errors.schoolName}
            disabled={!formData.city}
            onFocus={() => {
              handleSchoolFocus();
              // 포커스 시 에러 메시지 제거 확실히 하기
              setErrors((prev) => ({ ...prev, schoolName: '' }));
            }}
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
                    onClick={() => {
                      handleSchoolSelect(school);
                      // 학교 선택 시 에러 메시지 확실히 제거
                      setErrors((prev) => ({ ...prev, schoolName: '' }));
                    }}
                  >
                    {school}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="flex justify-center gap-4 mt-8">
          <Button
            className="w-full max-w-[200px] py-3 bg-white/50 hover:bg-green-500 hover:text-white"
            onClick={() => navigate('/login')}
          >
            취소
          </Button>
          <Button className="w-full max-w-[200px] py-3" onClick={handleJoin}>
            가입하기
          </Button>
        </div>
      </div>
    </div>
  );
};

export default JoinPage;
