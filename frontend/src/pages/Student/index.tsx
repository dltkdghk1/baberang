import { useState, useRef, useEffect, useCallback } from 'react';
import InputCard from '../../components/ui/inputcard';
import { FiDownload } from 'react-icons/fi';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import API_CONFIG from '../../config/api';
import axios from 'axios';
import { useAuthStore } from '../../store/authStore';
import { StudentListResponse, StudentDetailResponse, StudentType } from '../../types/types';
import { renderToStaticMarkup } from 'react-dom/server';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import LoadingAnimation from '../../components/LoadingAnimation';
import { showToast } from '../../utils/sweetalert';

const StudentManagement = () => {
  const [selectedGrade, setSelectedGrade] = useState<number | ''>('');
  const [selectedClass, setSelectedClass] = useState<number | ''>('');
  const [searchName, setSearchName] = useState('');
  const [students, setStudents] = useState<StudentType[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentType[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentType | null>(null);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);

  // 드롭다운 상태 관리
  const [showGradeDropdown, setShowGradeDropdown] = useState(false);
  const [showClassDropdown, setShowClassDropdown] = useState(false);

  // 드롭다운 참조 생성
  const gradeDropdownRef = useRef<HTMLDivElement>(null);
  const classDropdownRef = useRef<HTMLDivElement>(null);

  // 인증 스토어에서 토큰 및 인증 상태 가져오기
  const { accessToken, isAuthenticated } = useAuthStore();

  const reportRef = useRef<HTMLDivElement>(null);

  // 클래스 목록 (선택된 학년에 따라 달라짐)
  const classOptions = selectedGrade
    ? [...new Set(
      students
        .filter((s) => s.grade === selectedGrade)
        .map((s) => Number(s.classNum))
      )].sort((a, b) => a - b)
    : [];

  // 학년 목록 (중복 제거)
  const gradeOptions = [...new Set(students.map((s) => s.grade))].sort();

  // 클릭 이벤트 핸들러 - 드롭다운 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // 학년 드롭다운 외부 클릭
      if (gradeDropdownRef.current && !gradeDropdownRef.current.contains(event.target as Node)) {
        setShowGradeDropdown(false);
      }

      // 반 드롭다운 외부 클릭
      if (classDropdownRef.current && !classDropdownRef.current.contains(event.target as Node)) {
        setShowClassDropdown(false);
      }
    };

    // 이벤트 리스너 추가
    document.addEventListener('mousedown', handleClickOutside);

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // API에서 전체 학생 목록 가져오기
  const fetchAllStudents = async () => {
    try {
      setLoading(true);

      // 인증 여부 확인
      if (!isAuthenticated || !accessToken) {
        showToast('로그인이 필요합니다. 다시 로그인해주세요.', 'error');
        setLoading(false);
        return;
      }

      const response = await axios.get<StudentListResponse>(
        API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.STUDENT.GET_ALL),
        {
          headers: {
            Authorization: accessToken,
          },
        }
      );
      
      // API 응답을 내부 형식으로 변환
      const formattedStudents: StudentType[] = response.data.students.map((student) => ({
        id: student.studentId,
        name: student.studentName,
        grade: student.grade,
        classNum: student.classNum,
        studentNum: student.number,
        gender: student.gender || 'blank', // 기본값 설정
      }));

      setStudents(formattedStudents);
      setFilteredStudents(formattedStudents);

      // 첫 번째 학생 선택 (있는 경우) 및 상세 정보 불러오기
      if (formattedStudents.length > 0) {
        handleSelectStudent(formattedStudents[0]);
      }

      setLoading(false);
    } catch {
      showToast('학생 데이터를 불러오는 데 실패했습니다.', 'error');
      setLoading(false);
    }
  };

  // 특정 학생 정보 가져오기
  const fetchStudentDetail = useCallback(
    async (studentId: number) => {
      try {
        // 인증 여부 확인
        if (!isAuthenticated || !accessToken) {
          showToast('로그인이 필요합니다. 다시 로그인해주세요.', 'error');
          return;
        }

        const response = await axios.get<StudentDetailResponse>(
          API_CONFIG.getUrlWithPathParams(API_CONFIG.ENDPOINTS.STUDENT.GET_STUDENT_DETAIL, [
            studentId.toString(),
          ]),
          {
            headers: {
              Authorization: accessToken,
            },
          }
        );

        const data = response.data;

        // BMI 계산 (키는 cm 단위로 m로 변환)
        const heightInMeters = data.height / 100;
        const bmi = data.weight / (heightInMeters * heightInMeters);
        const wasteRate = Math.round(data.weeklyLeftoverAverage * 10) / 10
        const wasteRateStr = wasteRate.toFixed(1)

        // 현재 학생 정보 업데이트
        const updatedStudent: StudentType = {
          id: data.studentId,
          name: data.studentName,
          grade: data.grade,
          classNum: data.classNum,
          studentNum: data.number,
          gender: students.find((s) => s.id === data.studentId)?.gender || '남자',
          height: data.height,
          weight: data.weight,
          bmi: parseFloat(bmi.toFixed(1)),
          date: data.date,
          content: data.content,
          schoolName: data.schoolName,
          wasteRate: wasteRateStr
        };

        setSelectedStudent(updatedStudent);
      } catch {
        showToast('학생 상세 정보를 불러오는 데 실패했습니다.', 'error');
      }
    },
    [accessToken, isAuthenticated, students]
  );

  // 학생 선택 함수를 useCallback으로 메모이제이션
  const handleSelectStudent = useCallback(
    (student: StudentType) => {
      fetchStudentDetail(student.id); // 상세 정보 가져오기
      setAiReport(null); // 새 학생 선택시 리포트 초기화
    },
    [fetchStudentDetail]
  );

  // 컴포넌트 마운트 시 학생 목록 가져오기
  useEffect(() => {
    fetchAllStudents();
  }, []);

  // 필터링 로직
  useEffect(() => {
    if (students.length === 0) return;

    let result = [...students];

    if (selectedGrade) {
      result = result.filter((student) => student.grade === selectedGrade);
    }

    if (selectedClass) {
      result = result.filter((student) => student.classNum === selectedClass);
    }

    if (searchName) {
      result = result.filter((student) =>
        student.name.toLowerCase().includes(searchName.toLowerCase())
      );
    }

    setFilteredStudents(result);

    // 필터링된 결과가 있으면 첫 번째 학생을 자동 선택
    if (result.length > 0) {
      // 현재 선택된 학생이 필터 결과에 없으면 첫 번째 학생으로 변경
      const currentStudentInFilter = result.find((s) => s.id === selectedStudent?.id);
      if (!currentStudentInFilter) {
        handleSelectStudent(result[0]);
      }
    }
  }, [
    selectedGrade,
    selectedClass,
    searchName,
    students,
    selectedStudent?.id,
    handleSelectStudent,
  ]);

  // AI 건강 리포트 생성 함수
  const generateAIReport = async () => {
    if (!selectedStudent) return;

    try {
      setReportLoading(true);

      // 인증 여부 확인
      if (!isAuthenticated || !accessToken) {
        showToast('로그인이 필요합니다. 다시 로그인해주세요.', 'error');
        setReportLoading(false);
        return;
      }

      // 학생 ID로 건강 리포트 API 호출
      const response = await axios.get(
        API_CONFIG.getUrlWithPathParams(API_CONFIG.ENDPOINTS.STUDENT.HEALTH_REPORT, [
          selectedStudent.id.toString(),
          'health-report',
        ]),
        {
          headers: {
            Authorization: accessToken,
            'Content-Type': 'application/json',
          },
        }
      );

      // API 응답 데이터
      const reportData = response.data;

      interface LeftoverDatum {
        food: string;
        amount: number;
      }

      // 잔반 TOP3
      const leftoverMostData: LeftoverDatum[] = (
        Object.values(reportData.leftoverMost) as string[]
      ).map((food, i) => ({ food, amount: 3 - i }));

      const leftoverLeastData: LeftoverDatum[] = (
        Object.values(reportData.leftoverLeast) as string[]
      ).map((food, i) => ({ food, amount: 3 - i }));

      const medal = ['🥇', '🥈', '🥉'];

      const makeRanking = (arr: string[]) =>
        `<ol style="margin:0;padding:0 0 0 1.2em;list-style:none; font-size:16px;line-height:1.8;">
           ${arr
             .map(
               (food, i) =>
                 `<li style="display:flex;align-items:center;gap:6px;">
                <span style="font-size:26px;">${medal[i] ?? i + 1}</span>${food}
              </li>`
             )
             .join('')}
         </ol>`;

      /* 잔반 TOP3 문자열 준비 */
      const leastRankingHTML = makeRanking(leftoverLeastData.map((d) => d.food));
      const mostRankingHTML = makeRanking(leftoverMostData.map((d) => d.food));

      // 7일 영양소
      interface NutrientDay {
        carbo: number;
        protein: number;
        fat: number;
      }
      interface NutrientChartDatum extends NutrientDay {
        date: string;
      }

      const nutrientData: NutrientChartDatum[] = (
        Object.entries(reportData.nutrient) as [string, NutrientDay][]
      ).map(([date, v]) => ({
        date: date.slice(5), // "05-11"
        ...(v as NutrientDay), // 타입 단언
      }));

      const lineW = 700,
        lineH = 250;

      const makeLineSVG = (key: keyof NutrientDay, color: string, label: string) =>
        renderToStaticMarkup(
          <LineChart
            width={lineW}
            height={lineH}
            data={nutrientData}
            margin={{ top: 50, right: 40, left: 40, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              padding={{ left: 70, right: 70 }} 
              tickFormatter={(value) => value.replace('-', '/')}
              tick={{ fontSize: 12 }} // 글자 크기 증가
              height={35} // 높이 증가
            />
            <YAxis
              label={{
                value: '섭취량(g)',
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 12 }, // 글자 크기 증가
                offset: -10,
              }}
              tick={{ fontSize: 12 }} // 글자 크기 증가
              width={50} // 너비 증가
              domain={[0, 'auto']}
            />
            <Tooltip formatter={(value) => [`${value}g`, label]} />
            <Line
              name={label}
              type="monotone"
              dataKey={key}
              stroke={color}
              strokeWidth={3} // 선 두께 증가
              dot={{ r: 6, strokeWidth: 2, fill: 'white' }} // 점 크기 증가
              label={{
                position: 'top',
                formatter: (value) => (value > 0 ? value : ''),
                style: { fontSize: 12, fill: color, fontWeight: 'bold' }, // 글자 크기 증가
                offset: 10,
              }}
              activeDot={{ r: 8 }} // 활성 점 크기 증가
            />
          </LineChart>
        );

      const carboSVG = makeLineSVG('carbo', '#8884d8', '탄수화물');
      const proteinSVG = makeLineSVG('protein', '#ff7300', '단백질');
      const fatSVG = makeLineSVG('fat', '#82ca9d', '지방');

      // 현재 날짜
      const today = new Date();
      const dateString = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

      // HTML 리포트 생성
      const report = `
        <div style="font-family: 'Paperlogy', sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; position: relative;">
          <!-- 헤더 -->
          <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #2c5282; padding-bottom: 10px;">
            <h1 style="font-size: 24px; font-weight: bold; margin: 0; color: #2c5282;">학생 건강 관리 기록부</h1>
            <p style="font-size: 14px; margin: 5px 0 0;">발행일: ${dateString}</p>
          </div>

          <!-- 학생 정보 섹션 -->
          <div style="display: flex; margin-bottom: 20px;">
            <div style="flex: 1;">
              <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
                <tr>
                  <th style="background-color: #f0f4f8; padding: 8px; border: 1px solid #ddd; text-align: center; width: 100px;">이름</th>
                  <td style="padding: 8px; border: 1px solid #ddd;">${selectedStudent.name}</td>
                  <th style="background-color: #f0f4f8; padding: 8px; border: 1px solid #ddd; text-align: center;">학년/반/번호</th>
                  <td style="padding: 8px; border: 1px solid #ddd;">${selectedStudent.grade}학년 ${
        selectedStudent.classNum
      }반 ${selectedStudent.studentNum}번</td>
                </tr>
                <tr>
                  <th style="background-color: #f0f4f8; padding: 8px; border: 1px solid #ddd; text-align: center;">BMI 지수</th>
                  <td style="padding: 8px; border: 1px solid #ddd;">${
                    selectedStudent.bmi || '정보 없음'
                  }</td>
                  <th style="background-color: #f0f4f8; padding: 8px; border: 1px solid #ddd; text-align: center;">잔반율</th>
                  <td style="padding: 8px; border: 1px solid #ddd;">${
                    selectedStudent.wasteRate || 0
                  }%</td>
                </tr>
              </table>
            </div>
          </div>

          <!-- 건강 분석 결과 -->
          <div style="margin-bottom: 23px;">
            <h2 style="font-weight: 700; font-size: 18px; margin: 0 0 10px; padding: 5px 10px; background-color: #2c5282; color: white;">건강 분석 결과</h2>
            <div style="border: 1px solid #ddd; padding: 15px; background-color: #f9f9f9;">
              <p style="font-size: 16px; margin: 0;">${reportData.analyzeReport}</p>
            </div>
          </div>

          <div style="display: flex; gap: 20px; margin-bottom: 20px;">
            <!-- 가장 적게 남긴 TOP3 -->
            <div style="flex: 1;">
              <h2 style="font-weight: 700; font-size: 18px; margin: 0 0 10px; padding: 5px 10px; background-color: #2c5282; color: white;">가장 적게 남긴 TOP3</h2>
              <div style="border: 1px solid #ddd; padding: 15px; background-color: #f9f9f9;">
                ${leastRankingHTML}
              </div>
            </div>

            <!-- 가장 많이 남긴 TOP3 -->
            <div style="flex: 1;">
              <h2 style="font-weight: 700; font-size: 18px; margin: 0 0 10px; padding: 5px 10px; background-color: #2c5282; color: white;">가장 많이 남긴 TOP3</h2>
              <div style="border: 1px solid #ddd; padding: 15px; background-color: #f9f9f9;">
                ${mostRankingHTML}
              </div>
            </div>
          </div>

          <div style="margin-bottom: 20px;">
            <h2 style="font-weight: 700; font-size: 18px; margin: 0 0 10px; padding: 5px 10px; background-color: #2c5282; color: white;">7일간 섭취량</h2>
            <div style="border: 1px solid #ddd; padding: 15px; background-color: #f9f9f9;">
              <div style="margin-bottom: 20px;">
                <div style="display: flex; align-items: center; margin-bottom: 5px;">
                  <span style="width: 12px; height: 12px; background-color: #8884d8; display: inline-block; margin-right: 5px;"></span>
                  <span style="font-size: 18px; font-weight: bold;">탄수화물</span>
                </div>
                <div style="overflow: visible; display: flex; justify-content: center; width: 100%;">${carboSVG}</div>
              </div>
              <div style="margin-bottom: 20px;">
                <div style="display: flex; align-items: center; margin-bottom: 5px;">
                  <span style="width: 12px; height: 12px; background-color: #ff7300; display: inline-block; margin-right: 5px;"></span>
                  <span style="font-size: 18px; font-weight: bold;">단백질</span>
                </div>
                <div style="overflow: visible; display: flex; justify-content: center; width: 100%;">${proteinSVG}</div>
              </div>
              <div>
                <div style="display: flex; align-items: center; margin-bottom: 5px;">
                  <span style="width: 12px; height: 12px; background-color: #82ca9d; display: inline-block; margin-right: 5px;"></span>
                  <span style="font-size: 18px; font-weight: bold;">지방</span>
                </div>
                <div style="overflow: visible; display: flex; justify-content: center; width: 100%;">${fatSVG}</div>
              </div>
            </div>
          </div>

          <!-- 개선 방안 -->
          <div style="margin-bottom: 20px;">
            <h2 style="font-weight: 700; font-size: 18px; margin: 0 0 10px; padding: 5px 10px; background-color: #2c5282; color: white;">개선 방안</h2>
            <div style="border: 1px solid #ddd; padding: 15px; background-color: #f9f9f9;">
              <p style="font-size: 16px; margin: 0;">${reportData.plan}</p>
            </div>
          </div>

          <!-- 영양사 소견 -->
          <div style="margin-bottom: 20px;">
            <h2 style="font-weight: 700; font-size: 18px; margin: 0 0 10px; padding: 5px 10px; background-color: #2c5282; color: white;">영양사 소견</h2>
            <div style="border: 1px solid #ddd; padding: 15px; min-height: 80px; background-color: #f9f9f9;">
              <p style="font-size: 16px; margin: 0;">${reportData.opinion}</p>
            </div>
          </div>

          <!-- 바닥글/서명 -->
          <div style="text-align: center; margin-top: 40px;">
            <div style="font-size: 14px; margin-bottom: 30px;">
              본 건강 기록부는 AI 분석을 기반으로 작성되었습니다.
            </div>
            <div style="font-weight: bold;">
              영양사 : ________________ (인)
            </div>
          </div>
        </div>
      `;

      setAiReport(report);
      setReportLoading(false);
    } catch {
      showToast('AI 건강 리포트를 생성하는 데 실패했습니다.', 'error');
      setReportLoading(false);
    }
  };

  // PDF 다운로드 함수
  const handlePdfDownload = async () => {
    if (!reportRef.current || !selectedStudent) return;

    try {
      // 임시로 스타일 적용 - 모든 내용이 보이도록 함
      const reportElement = reportRef.current;
      const originalStyle = {
        maxHeight: reportElement.style.maxHeight,
        overflow: reportElement.style.overflow,
        height: reportElement.style.height,
      };

      // 리포트 요소의 스타일을 일시적으로 수정하여 모든 내용이 보이도록 함
      reportElement.style.maxHeight = 'none';
      reportElement.style.overflow = 'visible';
      reportElement.style.height = 'auto';

      // 스크롤 위치 기억
      const scrollPosition = window.scrollY;

      // HTML을 캔버스로 변환 (전체 내용 캡처)
      const canvas = await html2canvas(reportElement, {
        scale: 2, // 고해상도를 위한 스케일 설정
        useCORS: true, // 외부 이미지 허용
        logging: false, // 로깅 비활성화
        backgroundColor: '#ffffff', // 배경색 설정
        windowWidth: 1080, // 너비 고정 (더 넓은 뷰포트 시뮬레이션)
        windowHeight: 1920, // 높이 고정 (더 높은 뷰포트 시뮬레이션)
        onclone: (_, element) => {
          // 복제된 요소에 직접 스타일 적용 (더 안전함)
          element.style.maxHeight = 'none';
          element.style.height = 'auto';
          element.style.overflow = 'visible';
          element.style.width = '800px'; // 너비 고정
          element.style.padding = '0';
        },
      });

      // 원래 스타일 복원
      reportElement.style.maxHeight = originalStyle.maxHeight;
      reportElement.style.overflow = originalStyle.overflow;
      reportElement.style.height = originalStyle.height;

      // 스크롤 위치 복원
      window.scrollTo(0, scrollPosition);

      // 캔버스를 이미지로 변환
      const imgData = canvas.toDataURL('image/png');

      // PDF 생성 (A4 크기)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Canvas 비율 계산
      const imgWidth = 210; // A4 너비 (mm)
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // 이미지를 PDF에 추가
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }

      // 파일명 생성
      const fileName = `${selectedStudent.name}_건강기록부.pdf`;

      // PDF 다운로드
      pdf.save(fileName);
    } catch {
      // err
    }
  };

  return (
    <div className="min-h-screen w-full overflow-hidden relative">
      {/* 배경 이미지 */}
      <div className="absolute inset-0 z-0 bg-main bg-cover bg-center"></div>

      {/* 메인 컨텐츠 */}
      <div
        className="relative z-10 flex items-center justify-evenly"
        style={{ height: 'calc(100vh - 80px)', marginTop: '75px' }}
      >
        <div className="w-[90%] mx-auto">
          <div
            className="bg-[#F8F1E7] rounded-3xl shadow-lg p-0 flex flex-col overflow-hidden"
            style={{ height: '73vh' }}
          >
            {/* 학생관리 컨텐츠 */}
            <div className="px-6 py-3 flex-grow flex flex-row gap-4 mb-1 h-full">
              {/* 좌측: 필터링 */}
              <div className="w-full md:w-1/3 bg-transparent rounded-2xl p-6 flex flex-col h-full justify-between">
                <div className="mb-2">
                  {/* 학년 선택 - 커스텀 드롭다운 */}
                  <div className="mb-4 relative" ref={gradeDropdownRef}>
                    <label className="text-sm font-medium text-gray-700">학년</label>
                    <div
                      className="mt-2 w-full px-4 py-5 bg-white/50 rounded-2xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer flex justify-between items-center border border-[#ebf0eb]"
                      onClick={() => setShowGradeDropdown(!showGradeDropdown)}
                    >
                      <span>{selectedGrade ? `${selectedGrade}학년` : '전체 학년'}</span>
                      <span>▼</span>
                    </div>

                    {/* 드롭다운 메뉴 */}
                    {showGradeDropdown && gradeOptions.length > 0 && (
                      <div
                        className="absolute z-10 w-full mt-1 bg-white border-2 border-white rounded-lg shadow-xl overflow-auto"
                        style={{ maxHeight: '180px' }}
                      >
                        <div
                          className="p-3 hover:bg-green-50 cursor-pointer border-b border-gray-100 font-medium"
                          style={{ height: '50px', display: 'flex', alignItems: 'center' }}
                          onClick={() => {
                            setSelectedGrade('');
                            setSelectedClass('');
                            setShowGradeDropdown(false);
                          }}
                        >
                          전체 학년
                        </div>
                        {gradeOptions.map((grade) => (
                          <div
                            key={grade}
                            className="p-3 hover:bg-green-50 cursor-pointer border-b border-gray-100 font-medium"
                            style={{ height: '50px', display: 'flex', alignItems: 'center' }}
                            onClick={() => {
                              setSelectedGrade(grade);
                              setSelectedClass('');
                              setShowGradeDropdown(false);
                            }}
                          >
                            {grade}학년
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 반 선택 - 커스텀 드롭다운 */}
                  <div className="mb-4 relative" ref={classDropdownRef}>
                    <label className="text-sm font-medium text-gray-700">반</label>
                    <div
                      className={`mt-2 w-full px-4 py-5 bg-white/50 rounded-2xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer flex justify-between items-center border border-[#ebf0eb] ${
                        !selectedGrade ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      onClick={() => selectedGrade && setShowClassDropdown(!showClassDropdown)}
                    >
                      <span>{selectedClass ? `${selectedClass}반` : '전체 반'}</span>
                      <span>▼</span>
                    </div>

                    {/* 드롭다운 메뉴 */}
                    {showClassDropdown && classOptions.length > 0 && (
                      <div
                        className="absolute z-10 w-full mt-1 bg-white border-2 border-white rounded-lg shadow-xl overflow-auto"
                        style={{ maxHeight: '180px' }}
                      >
                        <div
                          className="p-3 hover:bg-green-50 cursor-pointer border-b border-gray-100 font-medium"
                          style={{ height: '50px', display: 'flex', alignItems: 'center' }}
                          onClick={() => {
                            setSelectedClass('');
                            setShowClassDropdown(false);
                          }}
                        >
                          전체 반
                        </div>
                        {classOptions.map((classNum) => (
                          <div
                            key={classNum}
                            className="p-3 hover:bg-green-50 cursor-pointer border-b border-gray-100 font-medium"
                            style={{ height: '50px', display: 'flex', alignItems: 'center' }}
                            onClick={() => {
                              setSelectedClass(classNum);
                              setShowClassDropdown(false);
                            }}
                          >
                            {classNum}반
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 이름 검색 */}
                  <div className="mb-4">
                    <InputCard
                      type="text"
                      placeholder="이름 검색"
                      label="이름"
                      value={searchName}
                      onChange={(e) => {
                        setSearchName(e.target.value);
                      }}
                    />
                  </div>
                </div>

                {/* 학생 목록 - 스크롤 가능한 창 */}
                <div className="flex-grow overflow-hidden bg-white/50 rounded-2xl px-4 py-2 flex flex-col">
                  <h3 className="text-base font-semibold mb-3 pl-2 text-gray-700">학생 목록</h3>
                  <div className="overflow-y-auto pr-2 flex-1">
                    {loading ? (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500">데이터를 불러오는 중...</p>
                      </div>
                    ) : filteredStudents.length > 0 ? (
                      <ul className="space-y-2">
                        {filteredStudents.map((student) => (
                          <li
                            key={student.id}
                            className={`px-4 py-3 rounded-md transition-colors ${
                              selectedStudent?.id === student.id
                                ? 'bg-[#96c059]/20 border border-[#96c059]/30'
                                : 'bg-white hover:bg-gray-50 border border-gray-100'
                            } ${reportLoading ? 'opacity-50 cursor-default' : 'cursor-pointer'}`}
                            onClick={() => {
                              if (!reportLoading) {
                                handleSelectStudent(student);
                              }
                            }}
                          >
                            <div className="flex items-center">
                              <div className="w-10 h-10 flex-shrink-0 mr-3">
                                <img
                                  src={`/images/student/${
                                    student.gender === '여자'
                                      ? 'girl.png'
                                      : student.gender === '남자'
                                      ? 'boy.png'
                                      : 'blank.png'
                                  }`}
                                  alt=""
                                  className="w-full h-full object-cover rounded-full"
                                  onError={(e) => {
                                    e.currentTarget.src = '/images/student/blank.png';
                                  }}
                                />
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-800">{student.name}</h4>
                                <p className="text-sm text-gray-500">
                                  {student.grade}학년 {student.classNum}반 {student.studentNum}번
                                </p>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500">검색 결과가 없습니다</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 우측: 학생 상세 정보 및 AI 리포트 */}
              <div className="flex flex-row w-full md:w-2/3 h-full items-center justify-center">
                {reportLoading ? (
                  <div className="flex items-center justify-center h-full w-full">
                    <LoadingAnimation type="report" message="AI 건강 리포트 생성 중..." />
                  </div>
                ) : !selectedStudent ? (
                  <div className="flex items-center justify-center h-full w-full">
                    <p className="text-gray-500">학생을 선택해주세요</p>
                  </div>
                ) : !aiReport ? (
                  <div className="flex flex-col items-center justify-center w-full h-full">
                    {/* 학생 정보 */}
                    <div className="bg-white/50 rounded-2xl shadow-md p-6 text-center w-full h-[95%] flex items-center justify-center">
                      <div className="flex flex-col items-center">
                        <div className="w-[180px] h-[180px] overflow-hidden mb-4 mx-auto flex items-center justify-center">
                          <img
                            src={`/images/student/${
                              selectedStudent.gender === '여자'
                                ? 'girl.png'
                                : selectedStudent.gender === '남자'
                                ? 'boy.png'
                                : 'blank.png'
                            }`}
                            alt={selectedStudent.name}
                            className="w-full h-full object-cover rounded-full"
                            onError={(e) => {
                              // 이미지 로드 실패시 기본 이미지로 대체
                              e.currentTarget.src = '/images/student/blank.png';
                            }}
                          />
                        </div>
                        <h2 className="text-2xl font-bold mb-4">이름 : {selectedStudent.name}</h2>
                        <p className="text-xl mb-3">
                          학번 : {selectedStudent.grade}
                          {selectedStudent.classNum.toString().padStart(2, '0')}
                          {selectedStudent.studentNum.toString().padStart(2, '0')}
                        </p>
                        <p className="text-xl mb-3">BMI : {selectedStudent.bmi || '정보 없음'}</p>
                        <p className="text-xl mb-3">잔반율 : {selectedStudent.wasteRate || 0}%</p>

                        <button
                          className={`mt-4 px-8 py-3 text-white rounded-2xl transition-colors text-base ${
                            reportLoading ? 'bg-gray-200' : 'bg-[#96c059] hover:bg-[#7ba348]'
                          }`}
                          onClick={reportLoading ? undefined : generateAIReport}
                          disabled={reportLoading}
                        >
                          {reportLoading ? '생성 중...' : 'AI 건강 리포트 생성'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* AI 리포트 */
                  <div className="bg-white/50 rounded-2xl shadow-md p-8 w-full h-[95%]">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold">AI 건강 리포트</h2>
                      <button
                        className="flex items-center space-x-2 text-red-600 hover:text-red-800 mr-6"
                        onClick={handlePdfDownload}
                      >
                        <FiDownload size={20} />
                        <span>PDF로 저장</span>
                      </button>
                    </div>

                    <div ref={reportRef} className="p-4 overflow-y-auto h-[calc(100%-70px)]">
                      <div
                        dangerouslySetInnerHTML={{ __html: aiReport }}
                        className="text-lg space-y-4"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentManagement;
