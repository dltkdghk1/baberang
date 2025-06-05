import { useState, useEffect } from 'react';
import backgroundMain from '/images/background/background_main.png';
import blankImage from '/images/student/blank.png';
import girlImage from '/images/student/girl.png';
import boyImage from '/images/student/boy.png';
import { StudentInfo, NFCInfo } from '../types/types';

// Flask 서버 URL
const FLASK_SERVER_URL = 'http://192.168.30.137:5000'; // 실제 서버 IP 주소

const TaggingPage = () => {
  const [studentInfo, setStudentInfo] = useState<StudentInfo>({
    gender: '',
    name: '',
    isTagged: false,
  });
  const [cameraStream, setCameraStream] = useState<string>('');

  // 테스트 버튼 - 실제 구현에서는 제거
  const simulateTagging = () => {
    // 테스트용: 랜덤 성별 및 이름 지정
    const genders = ['male', 'female'];
    const randomGender = genders[Math.floor(Math.random() * genders.length)];
    const randomName = randomGender === 'male' ? '이상화' : '김도연';

    setStudentInfo({
      gender: randomGender,
      name: randomName,
      isTagged: true,
    });
  };

  // 카메라 스트림 데이터 가져오기 (플라스크 서버 연동)
  const fetchCameraStream = async () => {
    try {
      const response = await fetch(`${FLASK_SERVER_URL}/camera-stream`);
      if (!response.ok) {
        throw new Error('서버 응답 오류');
      }

      const data = await response.json();
      if (data.streamUrl) {
        setCameraStream(data.streamUrl);
      }
    } catch {
      // 오류 처리
    }
  };

  // NFC 태깅 정보 가져오기
  const fetchNfcInfo = async () => {
    try {
      const response = await fetch(`${FLASK_SERVER_URL}/nfc-info`);
      if (!response.ok) {
        throw new Error('서버 응답 오류');
      }

      const data: NFCInfo = await response.json();

      if (data.isTagged) {
        setStudentInfo({
          gender: data.gender,
          name: data.name,
          isTagged: true,
        });
      }
    } catch {
      // 오류 처리
    }
  };

  useEffect(() => {
    // 컴포넌트 마운트 시 실행될 로직
    fetchCameraStream();

    // 주기적으로 카메라 스트림과 NFC 정보 업데이트
    const cameraIntervalId = setInterval(() => {
      fetchCameraStream();
    }, 1000); // 1초마다 업데이트

    const nfcIntervalId = setInterval(() => {
      fetchNfcInfo();
    }, 500); // 0.5초마다 업데이트

    return () => {
      // 컴포넌트 언마운트 시 정리
      clearInterval(cameraIntervalId);
      clearInterval(nfcIntervalId);
    };
  }, []);

  return (
    <div
      className="min-h-screen w-full"
      style={{
        backgroundImage: `url(${backgroundMain})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div
        className="flex justify-center items-center"
        style={{ paddingTop: '75px', height: 'calc(100vh - 60px)' }}
      >
        <div className="flex w-full max-w-[1200px] p-4 gap-24 justify-center">
          {/* 왼쪽: 학생 정보 표시 영역 */}
          <div className="w-1/3 bg-opacity-80 rounded-xl p-2 flex flex-col items-center">
            <div className="mb-6 mt-4">
              <img
                src={
                  studentInfo.isTagged
                    ? studentInfo.gender === 'female'
                      ? girlImage
                      : boyImage
                    : blankImage
                }
                alt="학생 아이콘"
                className="w-84 h-84 object-contain"
              />
            </div>

            <div className="text-center mt-4">
              {studentInfo.isTagged ? (
                <>
                  <h2 className="text-3xl font-bold mb-2">{studentInfo.name}님!</h2>
                  <p className="text-xl">식판을 인식해주세요</p>
                </>
              ) : (
                <h2 className="text-2xl font-bold">학생증을 인식시켜주세요</h2>
              )}
            </div>

            {/* 테스트용 버튼 - 실제 구현에서는 제거 */}
            <button
              onClick={simulateTagging}
              className="mt-6 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
            >
              태깅 시뮬레이션 (테스트용)
            </button>
          </div>

          {/* 오른쪽: 카메라 스트림 표시 영역 */}
          <div className="w-[1200px] h-[480px] bg-white bg-opacity-80 rounded-3xl overflow-hidden shadow-md flex items-center justify-center">
            {cameraStream ? (
              <img src={cameraStream} alt="카메라 스트림" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-72 flex items-center justify-center">
                <p className="text-xl">카메라 스트림 로딩 중...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaggingPage;
