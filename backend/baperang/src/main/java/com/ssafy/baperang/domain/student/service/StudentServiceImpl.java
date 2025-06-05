package com.ssafy.baperang.domain.student.service;

import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ssafy.baperang.domain.leftover.dto.response.ErrorResponseDto;
import com.ssafy.baperang.domain.leftover.entity.Leftover;
import com.ssafy.baperang.domain.leftover.repository.LeftoverRepository;
import com.ssafy.baperang.domain.menu.entity.Menu;
import com.ssafy.baperang.domain.menu.repository.MenuRepository;
import com.ssafy.baperang.domain.school.entity.School;
import com.ssafy.baperang.domain.student.dto.request.SaveStudentLeftoverRequestDto;
import com.ssafy.baperang.domain.student.dto.response.GetStudentLeftoverResponseDto;
import com.ssafy.baperang.domain.student.dto.response.SaveLeftoverResponseDto;
import com.ssafy.baperang.domain.student.dto.response.StudentDetailResponseDto;
import com.ssafy.baperang.domain.student.dto.response.StudentNamesResponseDto;
import com.ssafy.baperang.domain.student.entity.Student;
import com.ssafy.baperang.domain.student.repository.StudentRepository;
import com.ssafy.baperang.domain.user.entity.User;
import com.ssafy.baperang.domain.user.repository.UserRepository;
import com.ssafy.baperang.global.exception.BaperangErrorCode;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class StudentServiceImpl implements StudentService {

    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final LeftoverRepository leftoverRepository;
    private final MenuRepository menuRepository;
    private final DecimalFormat df = new DecimalFormat("#.##", new DecimalFormatSymbols(Locale.US));

    @Override
    @Transactional(readOnly = true)
    public Object getAllStudentNames(Long userId) {
        log.info("getAllStudentNames 함수 실행 - 사용자 ID: {}", userId);

        try {
            // 현재 로그인한 사용자 정보 조회
            User user = userRepository.findById(userId)
                    .orElse(null);

            if (user == null) {
                return ErrorResponseDto.of(BaperangErrorCode.USER_NOT_FOUND);
            }

            // 사용자의 학교 ID로 학생 이름 목록 조회
            List<Student> students = studentRepository.findBySchoolIdOrderByGradeAscClassNumAscNumberAsc(user.getSchool().getId());

            List<StudentNamesResponseDto.StudentInfo> studentInfos = students.stream()
                    .map(student -> StudentNamesResponseDto.StudentInfo.builder()
                            .studentId(student.getId())
                            .studentName(student.getStudentName())
                            .gender(student.getGender())
                            .grade(student.getGrade())
                            .classNum(student.getClassNum())
                            .number(student.getNumber())
                            .build())
                    .collect(Collectors.toList());

            log.info("getAllStudentNames 함수 성공 종료 - 학생 수: {}", studentInfos.size());

            // 결과 반환
            return StudentNamesResponseDto.builder()
                    .students(studentInfos)
                    .build();

        } catch (Exception e) {
            log.error("getAllStudentNames 함수 실행 중 오류 발생", e);
            return ErrorResponseDto.of(BaperangErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Object getStudentDetail(Long userId, Long studentId) {
        log.info("getStudentDetail 함수 실행 - 사용자 ID: {}, 학생 ID: {}", userId, studentId);

        try {
            // 현재 로그인한 사용자 정보 조회
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

            // 학교 ID와 학생 ID로 학생 조회 (권한 확인)
            Optional<Student> studentOpt = studentRepository.findByIdAndSchoolId(studentId, user.getSchool().getId());

            // 학생이 존재하지 않거나 다른 학교의 학생인 경우
            if (studentOpt.isEmpty()) {
                log.info("getStudentDetail 함수 실행 - 학생 없음 또는 접근 권한 없음 (ID: {})", studentId);
                return ErrorResponseDto.of(BaperangErrorCode.STUDENT_NOT_FOUND);
            }

            Student student = studentOpt.get();

            // Bmi 계산
            float height = student.getHeight() / 100.0f;
            float bmi = student.getWeight() / (height * height);
            bmi = Math.round(bmi * 10) / 10.0f;

            // 한 주간 잔반율 평균 계산
            Float weeklyLeftoverAverage = calculateWeeklyLeftoverAverage(student);

            // Entity를 DTO로 변환하여 반환
            StudentDetailResponseDto responseDto = StudentDetailResponseDto.fromEntity(student);

            // bmi 필드 설정 (새 DTO 생성)
            responseDto = StudentDetailResponseDto.builder()
                    .studentId(responseDto.getStudentId())
                    .studentName(responseDto.getStudentName())
                    .grade(responseDto.getGrade())
                    .classNum(responseDto.getClassNum())
                    .number(responseDto.getNumber())
                    .height(responseDto.getHeight())
                    .weight(responseDto.getWeight())
                    .date(responseDto.getDate())
                    .content(responseDto.getContent())
                    .schoolName(responseDto.getSchoolName())
                    .bmi(bmi)
                    .weeklyLeftoverAverage(weeklyLeftoverAverage)
                    .build();

            log.info("getStudentDetail 함수 성공 종료 - 학생 ID: {}, 이름: {}",
                    responseDto.getStudentId(), responseDto.getStudentName());

            return responseDto;

        } catch (Exception e) {
            log.error("getStudentDetail 함수 실행 중 오류 발생", e);
            return ErrorResponseDto.of(BaperangErrorCode.INTERNAL_SERVER_ERROR);
        }
    }



    @Override
    @Transactional
    public Object saveStudentLeftover(Long userId, SaveStudentLeftoverRequestDto requestDto) {
        log.info("saveStudentLeftover 실행 - 사용자 ID: {}, 학생 ID: {}", userId, requestDto.getStudentPk());

        try {
            // 사용자 확인
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> {
                        log.error("사용자를 찾을 수 없음. 사용자 ID: {}", userId);
                        return new RuntimeException("사용자를 찾을 수 없습니다.");
                    });

            if (!user.getSchool().getId().equals(requestDto.getSchoolPk())) {
                log.warn("saveStudentLeftover 권한 오류 - 학교 ID: {}, 사용자 학교 ID: {}",
                        requestDto.getSchoolPk(), user.getSchool().getId());
                return ErrorResponseDto.of(BaperangErrorCode.UNAUTHORIZED_ACCESS);
            }

            // 학생 존재 여부 확인
            Student student = studentRepository.findByIdAndSchoolId(
                    requestDto.getStudentPk(), requestDto.getSchoolPk()
            ).orElse(null);

            if (student == null) {
                return ErrorResponseDto.of(BaperangErrorCode.STUDENT_NOT_FOUND);
            }

            // 날짜 파싱
            LocalDate leftoverDate;
            try {
                leftoverDate = LocalDate.parse(requestDto.getLeftoverDate(), DateTimeFormatter.ISO_DATE);
            } catch (DateTimeParseException e) {
                return ErrorResponseDto.of(BaperangErrorCode.INVALID_INPUT_VALUE);
            }

            School school = user.getSchool();

            // 잔반 데이터 검증 및 저장
            List<Leftover> savedLeftovers = new ArrayList<>();
            for (Map.Entry<String, Float> entry : requestDto.getLeftover().entrySet()) {
                String menuName = entry.getKey();
                Float leftoverRate = entry.getValue();;

                // 잔반율 검증
                if (leftoverRate < 0 || leftoverRate > 100) {
                    return ErrorResponseDto.of(BaperangErrorCode.INVALID_INPUT_VALUE);
                }

                Menu menu;

                // 메뉴 존재 여부 확인
                boolean menuExists = menuRepository.existsBySchoolAndMenuDateAndMenuName(
                        school, leftoverDate, menuName
                );

                if (menuExists) {
                    List<Menu> menus = menuRepository.findBySchoolAndMenuDateBetweenOrderByMenuDate(
                            school, leftoverDate, leftoverDate
                    );

                    // 해당 날짜의 메뉴중 이름이 일치하는 메뉴 찾기
                    menu = menus.stream()
                            .filter(m -> m.getMenuName().equals(menuName))
                            .findFirst()
                            .orElseGet(() -> {
                                log.info("새 메뉴 생성 - 메뉴명: {}, 날짜: {}", menuName, leftoverDate);
                                Menu newMenu = Menu.builder()
                                        .school(school)
                                        .menuDate(leftoverDate)
                                        .menuName(menuName)
                                        .build();
                                return menuRepository.saveAndFlush(newMenu);
                            });

                    log.info("기존 메뉴 사용 - 메뉴 ID: {}, 메뉴명: {}", menu.getId(), menuName);
                } else {
                    log.info("새로운 메뉴 생성 - 메뉴명: {}, 날짜: {}", menuName, leftoverDate);
                    Menu newMenu = Menu.builder()
                            .school(school)
                            .menuDate(leftoverDate)
                            .menuName(menuName)
                            .build();
                    menu = menuRepository.saveAndFlush(newMenu);
                }

                try {
                    // 잔반 데이터 저장
                    Leftover leftover = Leftover.builder()
                            .student(student)
                            .menu(menu)
                            .leftoverDate(leftoverDate)
                            .leftMenuName(menuName)
                            .leftoverRate(leftoverRate)
                            .build();

                    savedLeftovers.add(leftoverRepository.save(leftover));
                    log.info("잔반 데이터 저장 성공 - 메뉴: {}, 학생: {}, 잔반율: {}%", menuName, student.getStudentName(), leftoverRate);
                } catch (Exception e) {
                    return ErrorResponseDto.of(BaperangErrorCode.AI_SERVER_RESPONSE_ERROR);
                }
            }

                        log.info("saveStudentLeftover 함수 성공 종료 - 저장된 잔반 데이터 수: {}", savedLeftovers.size());

            // 성공 응답 반환
            return SaveLeftoverResponseDto.builder()
                    .studentId(student.getId())
                    .studentName(student.getStudentName())
                    .leftoverDate(leftoverDate)
                    .count(savedLeftovers.size())
                    .message("잔반 데이터가 성공적으로 저장되었습니다.")
                    .build();
        } catch (Exception e) {
            return ErrorResponseDto.of(BaperangErrorCode.AI_SERVER_RESPONSE_ERROR);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Object getStudentLeftover(Long userId, String leftoverDateStr, int grade, int classNum, int number) {
        log.info("getStudentLeftover 함수 실행 - 사용자 ID: {}, 날짜: {}, 학년: {}, 반: {}, 번호: {}",
                userId, leftoverDateStr, grade, classNum, number);

        try {
            User user = userRepository.findById(userId)
                    .orElse(null);

            if (user == null) {
                return ErrorResponseDto.of(BaperangErrorCode.USER_NOT_FOUND);
            }

            School school = user.getSchool();

            LocalDate leftoverDate;
            try {
                leftoverDate = LocalDate.parse(leftoverDateStr, DateTimeFormatter.ISO_DATE);
            } catch (DateTimeParseException e) {
                log.warn("getStudentLeftover 함수 실행 - 날짜 형식 오류: {}", leftoverDateStr);
                return ErrorResponseDto.of(BaperangErrorCode.INVALID_INPUT_VALUE);
            }

            // 학생 조회 (학년, 반, 번호로)
            Student student = studentRepository.findBySchoolAndGradeAndClassNumAndNumber(
                            school, grade, classNum, number)
                    .orElse(null);

            if (student == null) {
                log.warn("getStudentLeftover 함수 실행 - 학생을 찾을 수 없음 (학년: {}, 반: {}, 번호: {})",
                        grade, classNum, number);
                return ErrorResponseDto.of(BaperangErrorCode.STUDENT_NOT_FOUND);
            }

            // 해당 학생의 해당 날짜 잔반 데이터 조회
            List<Leftover> leftovers = leftoverRepository.findByStudentAndLeftoverDate(student, leftoverDate);

            if (leftovers.isEmpty()) {
                log.info("getStudentLeftover 함수 실행 - 잔반 데이터 없음");
                // 데이터가 없는 경우 빈 맵 반환
                return GetStudentLeftoverResponseDto.builder()
                        .leftoverDate(leftoverDateStr)
                        .studentName(student.getStudentName())
                        .leftover(Collections.emptyMap())
                        .build();
            }

            // 메뉴명과 잔반율을 매핑
            Map<String, Float> leftoverMap = leftovers.stream()
                    .collect(Collectors.toMap(
                            Leftover::getLeftMenuName,
                            Leftover::getLeftoverRate,
                            (existing, replacement) -> replacement  // 중복 시 나중 값 사용
                    ));

            log.info("getStudentLeftover 함수 성공 종료 - 조회된 메뉴 수: {}", leftoverMap.size());

            // 성공 응답 반환
            return GetStudentLeftoverResponseDto.builder()
                    .leftoverDate(leftoverDateStr)
                    .studentName(student.getStudentName())
                    .leftover(leftoverMap)
                    .build();

        } catch (Exception e) {
            log.error("getStudentLeftover 함수 실행 중 오류 발생: {}", e.getMessage(), e);
            return ErrorResponseDto.of(BaperangErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * 한 주간 전체 잔반율 평균 계산
     * 오늘을 미포함한 7일간의 전체 잔반율 평균을 계산합니다.
     */
    private Float calculateWeeklyLeftoverAverage(Student student) {
        // HealthReportService와 동일한 날짜 계산 로직
        LocalDate endDate = LocalDate.now().minusDays(1);    // 어제
        LocalDate startDate = endDate.minusDays(6);          // 7일 전

        log.info("한 주간 전체 잔반율 계산 - 학생: {}, 기간: {} ~ {} (오늘 미포함 7일간)",
                student.getStudentName(), startDate, endDate);

        // 해당 기간의 잔반 데이터 조회
        List<Leftover> weeklyLeftovers = leftoverRepository
                .findByStudentAndLeftoverDateBetween(student, startDate, endDate);

        if (weeklyLeftovers.isEmpty()) {
            log.info("한 주간 잔반 데이터 없음 - 학생: {}", student.getStudentName());
            return 0.0f;
        }

        // 전체 잔반율 평균 계산
        double average = weeklyLeftovers.stream()
                .mapToDouble(leftover -> leftover.getLeftoverRate().doubleValue())
                .average()
                .orElse(0.0);

        // HealthReportService와 동일한 DecimalFormat 적용
        Float result = Float.parseFloat(df.format(average));

        log.info("한 주간 전체 잔반율 계산 완료 - 학생: {}, 평균: {}%",
                student.getStudentName(), result);

        return result;
    }
}