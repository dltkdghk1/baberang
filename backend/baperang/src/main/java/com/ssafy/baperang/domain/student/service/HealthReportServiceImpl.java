package com.ssafy.baperang.domain.student.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.baperang.domain.leftover.dto.response.ErrorResponseDto;
import com.ssafy.baperang.domain.leftover.entity.Leftover;
import com.ssafy.baperang.domain.menu.entity.Menu;
import com.ssafy.baperang.domain.menu.repository.MenuRepository;
import com.ssafy.baperang.domain.menunutrient.entity.MenuNutrient;
import com.ssafy.baperang.domain.menunutrient.repository.MenuNutrientRepository;
import com.ssafy.baperang.domain.student.dto.request.HealthReportRequestDto;
import com.ssafy.baperang.domain.student.dto.response.HealthReportResponseDto;
import com.ssafy.baperang.domain.student.entity.Student;
import com.ssafy.baperang.domain.leftover.repository.LeftoverRepository;
import com.ssafy.baperang.domain.student.repository.StudentRepository;
import com.ssafy.baperang.global.exception.BaperangErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import com.ssafy.baperang.global.jwt.JwtService;
import org.springframework.beans.factory.annotation.Value;

import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class HealthReportServiceImpl implements HealthReportService{

    private final StudentRepository studentRepository;
    private final LeftoverRepository leftoverRepository;
    private final MenuNutrientRepository menuNutrientRepository;
    private final MenuRepository menuRepository; // 추가: Menu 레포지토리
    private final JwtService jwtService;
    private final ObjectMapper objectMapper;

    private final DecimalFormat df = new DecimalFormat("#.##", new DecimalFormatSymbols(Locale.US));

    @Value("${AI_SERVER_BASE_URL}")
    private String aiServerBaseUrl;

    private static final String HEALTH_REPORT_ENDPOINT = "/ai/health-report";


    // nutrient 테이블의 PK 매핑
    private static final String CARBO_NUTRIENT_NAME = "탄수화물";     // 탄수화물 (g)
    private static final String PROTEIN_NUTRIENT_NAME = "단백질";   // 단백질 (g)
    private static final String FAT_NUTRIENT_NAME = "지방";       // 지방 (g)

    private static final Map<String, String> NUTRIENT_NAME_TO_FIELD = new HashMap<>();
    static {
        NUTRIENT_NAME_TO_FIELD.put(CARBO_NUTRIENT_NAME, "carbo");
        NUTRIENT_NAME_TO_FIELD.put(PROTEIN_NUTRIENT_NAME, "protein");
        NUTRIENT_NAME_TO_FIELD.put(FAT_NUTRIENT_NAME, "fat");
    }

    @Override
    @Transactional
    public Object generateReport(String token, Long studentId) {
        log.info("건강 리포트 생성 시작, 학생 ID - {}", studentId);

        try {
            // 토큰 유효성 검사
            if (!jwtService.validateToken(token)) {
                return ErrorResponseDto.of(BaperangErrorCode.INVALID_TOKEN);
            }

            Long userPk = jwtService.getUserId(token);
            if (userPk == null) {
                return ErrorResponseDto.of(BaperangErrorCode.INVALID_TOKEN);
            }

            Optional<Student> studentOpt = studentRepository.findById(studentId);
            if (studentOpt.isEmpty()) {
                return ErrorResponseDto.of(BaperangErrorCode.STUDENT_NOT_FOUND);
            }

            Student student = studentOpt.get();
            LocalDate today = LocalDate.now();

            // BMI 계산
            Float height = student.getHeight() / 100f;
            Float weight = student.getWeight();
            Float bmi = weight / (height * height);
            String formattedBmi = df.format(bmi);
            log.info("학생 BMI 계산: {}", formattedBmi);

            // 보고서 분석 기간 설정
            LocalDate endDate = LocalDate.now().minusDays(1);
            LocalDate startDate = endDate.minusDays(6);

            // 기간 내 모든 날짜 생성
            List<LocalDate> allDates = new ArrayList<>();
            LocalDate currentDate = startDate;
            while (!currentDate.isAfter(endDate)) {
                allDates.add(currentDate);
                currentDate = currentDate.plusDays(1);
            }

            // 모든 잔반 데이터 한 번에 조회
            List<Leftover> allLeftovers = leftoverRepository.findByStudentAndLeftoverDateBetween(student, startDate, endDate);

            // 메뉴 ID 추출
            Set<Long> menuIds = allLeftovers.stream()
                    .map(leftover -> leftover.getMenu().getId())
                    .collect(Collectors.toSet());

            // 모든 메뉴 정보 한 번에 조회하여 Map에 저장
            List<Menu> menus = menuRepository.findAllByIdIn(new ArrayList<>(menuIds));
            Map<Long, Menu> menuMap = menus.stream()
                    .collect(Collectors.toMap(
                            Menu::getId,
                            menu -> menu,
                            (existing, replacement) -> replacement
                    ));

            // 날짜별로 잔반 데이터 분류
            Map<LocalDate, List<Leftover>> leftoversByDate = allLeftovers.stream()
                    .collect(Collectors.groupingBy(Leftover::getLeftoverDate));

            // 카테고리별 평균 잔반율 - 최적화된 메소드 사용
            Map<String, Float> categoryLeftoverMap = calcLeftoverByCategory(allLeftovers, menuMap);

            // 잔반율 top3 bottom3 계산
            Map<String, Map<String, String>> leftoverRankingMap = getRankings(allLeftovers);

            // 영양소 정보 한 번에 조회
            List<MenuNutrient> allNutrients = menuNutrientRepository.findByMenuIdInAndNutrient_NutrientNameIn(
                    new ArrayList<>(menuIds),
                    Arrays.asList(CARBO_NUTRIENT_NAME, PROTEIN_NUTRIENT_NAME, FAT_NUTRIENT_NAME));

            // 영양소 정보 맵 생성
            Map<String, MenuNutrient> nutrientMap = allNutrients.stream()
                    .collect(Collectors.toMap(
                            menuNutrient -> menuNutrient.getMenu().getId() + "-" + menuNutrient.getNutrient().getNutrientName(),
                            menuNutrient -> menuNutrient,
                            (existing, replacement) -> replacement
                    ));

            // 일주일간 섭취한 영양소 계산 (AI 요청용)
            Map<String, Map<String, Integer>> dailyNutrientData = calcOptimizedNutrients(
                    leftoversByDate,
                    nutrientMap,
                    allDates);

            // 한 주간 영양소 합계 계산
            int weeklyCarbo = 0;
            int weeklyProtein = 0;
            int weeklyFat = 0;

            for (Map<String, Integer> dailyNutrient : dailyNutrientData.values()) {
                weeklyCarbo += dailyNutrient.getOrDefault("carbo", 0);
                weeklyProtein += dailyNutrient.getOrDefault("protein", 0);
                weeklyFat += dailyNutrient.getOrDefault("fat", 0);
            }

            // 주간 영양소 데이터 - 이것만 응답에 포함
            Map<String, Integer> weeklyNutrient = new HashMap<>();
            weeklyNutrient.put("carbo", weeklyCarbo);
            weeklyNutrient.put("protein", weeklyProtein);
            weeklyNutrient.put("fat", weeklyFat);

            Map<String, Map<String, Integer>> newNutrientFormat = new TreeMap<>(dailyNutrientData);

            // 최종 응답을 위한 맵 생성
            Map<String, Object> responseMap = new HashMap<>();

            // 요청 데이터 추가 (주간 영양소 합계만 포함)
            responseMap.put("bmi", Float.parseFloat(formattedBmi));
            responseMap.put("leftoverMost", leftoverRankingMap.get("most"));
            responseMap.put("leftoverLeast", leftoverRankingMap.get("least"));
            responseMap.put("nutrient", newNutrientFormat);

            // 중복 체크
            if (student.getContentDate() != null && student.getContentDate().equals(today)) {
                log.warn("학생 ID: {}의 건강리포트가 오늘({}) 이미 생성되었습니다.", studentId, today);

                try {
                    // 저장된 리포트 내용을 파싱하여 응답에 추가
                    HealthReportResponseDto responseDto = objectMapper.readValue(student.getContent(), HealthReportResponseDto.class);

                    responseMap.put("analyzeReport", responseDto.getAnalyzeReport());
                    responseMap.put("plan", responseDto.getPlan());
                    responseMap.put("opinion", responseDto.getOpinion());
                    responseMap.put("isDuplicate", true);

                    return responseMap;
                } catch (Exception e) {
                    log.error("저장된 리포트 파싱 중 오류: {}", e.getMessage(), e);
                    return ErrorResponseDto.of(BaperangErrorCode.INTERNAL_SERVER_ERROR);
                }
            }

            // ai로 보낼 요청 데이터 (AI에게는 일별 데이터를 보냄)
            HealthReportRequestDto requestDto = HealthReportRequestDto.builder()
                    .bmi(Float.parseFloat(formattedBmi))
                    .leftover(categoryLeftoverMap)
                    .leftoverMost(leftoverRankingMap.get("most"))
                    .leftoverLeast(leftoverRankingMap.get("least"))
                    .nutrient(dailyNutrientData) // AI에게는 날짜별 영양소 데이터 제공
                    .build();

            // AI 서버에 요청 보내기
            HealthReportResponseDto responseDto = getAiAnalysis(requestDto);

            // AI 응답을 응답 맵에 추가
            responseMap.put("analyzeReport", responseDto.getAnalyzeReport());
            responseMap.put("plan", responseDto.getPlan());
            responseMap.put("opinion", responseDto.getOpinion());

            // JSON 형태로 변환하여 저장
            String reportContent = objectMapper.writeValueAsString(responseDto);

            // 학생 엔티티에 리포트 내용 저장
            student.updateContent(reportContent, today);
            studentRepository.saveAndFlush(student);

            return responseMap;

        } catch (Exception e) {
            log.error("건강 리포트 생성 중 오류 발생: {}", e.getMessage(), e);
            return ErrorResponseDto.of(BaperangErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    @Override
    @Transactional
    public Object saveReport(Long studentId, String reportContent) {
        log.info("건강 리포트 저장 시작 - 학생 ID: {}", studentId);

        try {

            Optional<Student> studentOpt = studentRepository.findById(studentId);
            if (studentOpt.isEmpty()) {
                log.error("학생을 찾을 수 없음 - 학생 ID: {}", studentId);
                return ErrorResponseDto.of(BaperangErrorCode.STUDENT_NOT_FOUND);
            }

            Student student = studentOpt.get();

            // content와 contentDate 업데이트
            student.updateContent(reportContent, LocalDate.now());
            studentRepository.saveAndFlush(student);

            log.info("건강 리포트 저장 완료 - 학생 ID: {}", studentId);

            // 저장된 리포트 내용을 응답으로 반환
            HealthReportResponseDto responseDto = objectMapper.readValue(reportContent, HealthReportResponseDto.class);
            return responseDto;

        } catch (Exception e) {
            log.error("건강 리포트 저장 중 오류 발생: {}", e.getMessage(), e);
            return ErrorResponseDto.of(BaperangErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    // 최적화된 카테고리별 평균 잔반율 계산 메소드
    private Map<String, Float> calcLeftoverByCategory(List<Leftover> leftovers, Map<Long, Menu> menuMap) {
        Map<String, List<Float>> categoryRates = new HashMap<>();

        for (Leftover leftover : leftovers) {
            Long menuId = leftover.getMenu().getId();
            // 미리 조회한 메뉴 정보에서 카테고리 가져오기
            Menu menu = menuMap.get(menuId);
            if (menu != null) {
                String category = menu.getCategory();
                Float rate = leftover.getLeftoverRate();
                categoryRates.computeIfAbsent(category, k -> new ArrayList<>()).add(rate);
            }
        }

        // 나머지 계산 코드는 기존과 동일
        Map<String, Float> result = new HashMap<>();
        for (Map.Entry<String, List<Float>> entry : categoryRates.entrySet()) {
            List<Float> rates = entry.getValue();
            double average = rates.stream().mapToDouble(Float::doubleValue).average().orElse(0.0);
            result.put(entry.getKey(), Float.parseFloat(df.format(average)));
        }

        // 카테고리가 없는 경우 기본값 설정
        result.putIfAbsent("rice", 0.0f);
        result.putIfAbsent("soup", 0.0f);
        result.putIfAbsent("main", 0.0f);
        result.putIfAbsent("side", 0.0f);

        return result;
    }

    // 기존 카테고리별 평균 잔반율 계산 메소드 (호환성 유지)
    private Map<String, Float> calcLeftoverByCategory(List<Leftover> leftovers) {
        Map<String, List<Float>> categoryRates = new HashMap<>();

        for (Leftover leftover : leftovers) {
            String category = leftover.getMenu().getCategory();
            Float rate = leftover.getLeftoverRate();

            categoryRates.computeIfAbsent(category, k -> new ArrayList<>()).add(rate);
        }

        Map<String, Float> result = new HashMap<>();
        for (Map.Entry<String, List<Float>> entry : categoryRates.entrySet()) {
            List<Float> rates = entry.getValue();
            double average = rates.stream().mapToDouble(Float::doubleValue).average().orElse(0.0);
            result.put(entry.getKey(), Float.parseFloat(df.format(average)));
        }

        // 카테고리가 없는 경우 기본값 0.0 설정
        result.putIfAbsent("rice", 0.0f);
        result.putIfAbsent("soup", 0.0f);
        result.putIfAbsent("main", 0.0f);
        result.putIfAbsent("side", 0.0f);

        return result;
    }

    // 잔반율 TOP3, BOTTOM3 계산
    private Map<String, Map<String, String>> getRankings(List<Leftover> leftovers) {
        // 메뉴별 평균 잔반율 계산
        Map<String, List<Float>> menuRates = new HashMap<>();

        for (Leftover leftover : leftovers) {
            String menuName = leftover.getLeftMenuName();
            Float rate = leftover.getLeftoverRate();
            menuRates.computeIfAbsent(menuName, k -> new ArrayList<>()).add(rate);
        }

        // 메뉴별 평균 계산
        Map<String, Float> menuAverages = new HashMap<>();
        for (Map.Entry<String, List<Float>> entry : menuRates.entrySet()) {
            double average = entry.getValue() // 현재 메뉴의 모든 잔반율 가져오기
                    .stream() // 스트림으로 변환
                    .mapToDouble(Float::doubleValue) // float을 double로 변환
                    .average()
                    .orElse(0.0); // 목록이 비어있으면 0.0

            menuAverages.put(
                    entry.getKey(),
                    Float.parseFloat(
                            df.format(average)));
        }

        // 잔반율 기준 정렬
        List<Map.Entry<String, Float>> sortedEntries = new ArrayList<>(menuAverages.entrySet());

        // 내림차순 정렬 (가장 많이 남긴 순)
        sortedEntries.sort(Map.Entry.<String, Float>comparingByValue().reversed());

        // TOP3 (가장 많이 남긴 음식)
        Map<String, String> most = new HashMap<>();
        for (int i = 0; i < Math.min(3, sortedEntries.size()); i++) {
            most.put(String.valueOf(i + 1), sortedEntries.get(i).getKey());
        }

        // 오름차순 정렬 (가장 적게 남긴 순)
        sortedEntries.sort(Map.Entry.comparingByValue());

        // BOTTOM3 (가장 적게 남긴 음식)
        Map<String, String> least = new HashMap<>();
        for (int i = 0; i < Math.min(3, sortedEntries.size()); i++) {
            least.put(String.valueOf(i + 1), sortedEntries.get(i).getKey());
        }

        Map<String, Map<String, String>> result = new HashMap<>();
        result.put("most", most);
        result.put("least", least);

        return result;
    }

    // 기존 영양소 계산 메소드 (호환성 유지)
    private Map<String, Map<String, Integer>> calcNutrients(Student student, LocalDate startDate, LocalDate endDate) {
        Map<String, Map<String, Integer>> result = new HashMap<>();

        // startDate부터 endDate까지 순회
        LocalDate currentDate = startDate;
        while (!currentDate.isAfter(endDate)) {
            // 현재 날짜의 영양소 섭취량 계산
            Map<String, Integer> dailyNutrients = calcDailyNutrients(student, currentDate);

            // 결과에 추가
            result.put(currentDate.toString(), dailyNutrients);

            // 다음 날짜로 이동
            currentDate = currentDate.plusDays(1);
        }

        return result;
    }

    // 기존 특정 날짜의 영양소 섭취량 계산 메소드 (호환성 유지)
    private Map<String, Integer> calcDailyNutrients(Student student, LocalDate date) {
        // 해당 날짜에 학생이 섭취한 메뉴 조회
        List<Leftover> leftovers = leftoverRepository.findByStudentAndLeftoverDate(student, date);

        // 영양소별 합계 초기화
        int totalCarbo = 0;
        int totalProtein = 0;
        int totalFat = 0;

        if (!leftovers.isEmpty()) {
            // 모든 메뉴 ID 수집
            List<Long> menuIds = leftovers.stream()
                    .map(leftover -> leftover.getMenu().getId())
                    .collect(Collectors.toList());

            // 필요한 영양소 한번에 조회
            List<MenuNutrient> allNutrients = menuNutrientRepository.findByMenuIdInAndNutrient_NutrientNameIn(
                    menuIds, Arrays.asList(CARBO_NUTRIENT_NAME, PROTEIN_NUTRIENT_NAME, FAT_NUTRIENT_NAME));

            // 조회한 영양소 정보를 맵으로 변환
            // 키: "메뉴ID-영양소ID". 값: MenuNutrient
            Map<String, MenuNutrient> nutrientMap = allNutrients.stream()
                    .collect(Collectors.toMap(
                            menuNutrient -> menuNutrient.getMenu().getId() + "-" + menuNutrient.getNutrient().getNutrientName(),
                            menuNutrient -> menuNutrient,
                            (existing, replacement) -> replacement
                    ));

            // 각 메뉴의 영양소 정보 조회 및 합산
            for (Leftover leftover : leftovers) {
                Long menuId = leftover.getMenu().getId();
                float leftoverRate = leftover.getLeftoverRate() / 100f; // 백분율을 소수로 변환 (30% -> 0.3)
                float consumptionRate = 1 - leftoverRate; // 실제 섭취율 (1 - 0.3 = 0.7 즉 70%)

                // 맵에서 각 영양소 정보 조회
                String carboKey = menuId + "-" + CARBO_NUTRIENT_NAME;
                String proteinKey = menuId + "-" + PROTEIN_NUTRIENT_NAME;
                String fatKey = menuId + "-" + FAT_NUTRIENT_NAME;

                // 탄수화물 계산
                MenuNutrient carbo = nutrientMap.get(carboKey);
                if (carbo != null) {
                    totalCarbo += Math.round(carbo.getAmount() * consumptionRate);
                }

                // 단백질 계산
                MenuNutrient protein = nutrientMap.get(proteinKey);
                if (protein != null) {
                    totalProtein += Math.round(protein.getAmount() * consumptionRate);
                }

                // 지방 계산
                MenuNutrient fat = nutrientMap.get(fatKey);
                if (fat != null) {
                    totalFat += Math.round(fat.getAmount() * consumptionRate);
                }
            }
        }

        // 계산된 영양소 섭취량을 g 단위로 저장
        Map<String, Integer> result = new HashMap<>();
        result.put("carbo", totalCarbo);
        result.put("protein", totalProtein);
        result.put("fat", totalFat);

        return result;
    }

    // 최적화된 영양소 계산 메소드
    private Map<String, Map<String, Integer>> calcOptimizedNutrients(
            Map<LocalDate, List<Leftover>> leftoversByDate,
            Map<String, MenuNutrient> nutrientMap,
            List<LocalDate> allDates) {

        Map<String, Map<String, Integer>> result = new HashMap<>();

        // 모든 날짜에 대해 처리
        for (LocalDate date : allDates) {
            List<Leftover> dayLeftovers = leftoversByDate.getOrDefault(date, Collections.emptyList());

            // 영양소별 합계 초기화
            int totalCarbo = 0;
            int totalProtein = 0;
            int totalFat = 0;

            // 해당 날짜의 잔반 데이터 처리
            for (Leftover leftover : dayLeftovers) {
                Long menuId = leftover.getMenu().getId();
                float leftoverRate = leftover.getLeftoverRate() / 100f;
                float consumptionRate = 1 - leftoverRate;

                // 맵에서 영양소 정보 조회
                String carboKey = menuId + "-" + CARBO_NUTRIENT_NAME;
                String proteinKey = menuId + "-" + PROTEIN_NUTRIENT_NAME;
                String fatKey = menuId + "-" + FAT_NUTRIENT_NAME;

                MenuNutrient carbo = nutrientMap.get(carboKey);
                if (carbo != null) {
                    totalCarbo += Math.round(carbo.getAmount() * consumptionRate);
                }

                MenuNutrient protein = nutrientMap.get(proteinKey);
                if (protein != null) {
                    totalProtein += Math.round(protein.getAmount() * consumptionRate);
                }

                MenuNutrient fat = nutrientMap.get(fatKey);
                if (fat != null) {
                    totalFat += Math.round(fat.getAmount() * consumptionRate);
                }
            }

            // 계산된 영양소 저장
            Map<String, Integer> dailyNutrients = new HashMap<>();
            dailyNutrients.put("carbo", totalCarbo);
            dailyNutrients.put("protein", totalProtein);
            dailyNutrients.put("fat", totalFat);

            result.put(date.toString(), dailyNutrients);
        }

        return result;
    }

    // AI 서버에 분석 요청 - 수정된 메서드
    private HealthReportResponseDto getAiAnalysis(HealthReportRequestDto requestDto) throws JsonProcessingException {
        log.info("AI 서버에 분석 요청 전송");

        // 요청 헤더 설정
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        // 요청 바디 생성
        String requestBody = objectMapper.writeValueAsString(requestDto);
        HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);



        String aiServerUrl = aiServerBaseUrl + HEALTH_REPORT_ENDPOINT;
        // 로컬 테스트를 위한 하드코딩 URL 사용 (주석 해제)
        // String aiServerUrl = "http://127.0.0.1:8001/ai/health-report";
        log.info("AI 서버 URL: {}", aiServerUrl);

        // RestTemplate 인스턴스를 필요할 때 생성
        RestTemplate restTemplate = new RestTemplate();

        // AI 서버에 요청 전송
        ResponseEntity<String> response = restTemplate.postForEntity(
                aiServerUrl, entity, String.class
        );

        // 응답 처리
        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
            return objectMapper.readValue(response.getBody(), HealthReportResponseDto.class);
        } else {
            log.error("AI 서버 응답 실패: {}", response.getStatusCode());
            throw new RuntimeException("AI 서버 응답 실패");
        }
    }
}
