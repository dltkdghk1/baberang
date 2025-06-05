package com.ssafy.baperang.domain.menu.service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import com.ssafy.baperang.domain.holiday.entity.Holiday;
import com.ssafy.baperang.domain.holiday.repository.HolidayRepository;
import com.ssafy.baperang.domain.menu.dto.request.MenuPlanRequestDto;
import com.ssafy.baperang.domain.menu.dto.request.MenuRequestDto;
import com.ssafy.baperang.domain.menu.dto.response.ErrorResponseDto;
import com.ssafy.baperang.domain.menu.dto.response.MenuPlanResponseDto;
import com.ssafy.baperang.domain.menu.dto.response.MenuResponseDto;
import com.ssafy.baperang.domain.menu.entity.Menu;
import com.ssafy.baperang.domain.menu.repository.MenuRepository;
import com.ssafy.baperang.domain.menunutrient.entity.MenuNutrient;
import com.ssafy.baperang.domain.menunutrient.repository.MenuNutrientRepository;
import com.ssafy.baperang.domain.school.entity.School;
import com.ssafy.baperang.domain.school.repository.SchoolRepository;
import com.ssafy.baperang.domain.user.entity.User;
import com.ssafy.baperang.domain.user.repository.UserRepository;
import com.ssafy.baperang.global.exception.BaperangErrorCode;
import com.ssafy.baperang.global.jwt.JwtService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class MenuServiceImpl implements MenuService {
    private final MenuRepository menuRepository;
    private final UserRepository userRepository;
    private final MenuNutrientRepository menuNutrientRepository;
    private final HolidayRepository holidayRepository;
    private final JwtService jwtService;

    @Value("${AI_SERVER_BASE_URL}")
    private String aiServerBaseUrl;

    private static final String MENU_PLAN_ENDPOINT = "/ai/menu-plan";

    private final SchoolRepository schoolRepository;

    @Override
    @Transactional(readOnly = true)
    public Object getMenuCalendar(MenuRequestDto requestDto, String token) {
        int year = requestDto.getYear();
        int month = requestDto.getMonth();

        try {
            // 토큰 유효성
            if (!jwtService.validateToken(token)) {
                log.info("getMenuCalendar - 토큰 유효하지 않음");
                return ErrorResponseDto.of(BaperangErrorCode.INVALID_TOKEN);
            }

            Long userPk = jwtService.getUserId(token);
            log.info("getMenuCalendar - 사용자ID: {}", userPk);

            // 현재 로그인한 사용자의 학교 정보 조회
            User user = userRepository.findById(userPk)
                    .orElse(null);

            if (user == null) {
                log.info("getMenuCalendar - 사용자 정보 없음");
                return ErrorResponseDto.of(BaperangErrorCode.USER_NOT_FOUND);
            }

            School school = user.getSchool();

            // 해당 월의 시작일과 마지막 일 계산
            YearMonth yearMonth = YearMonth.of(year, month);
            LocalDate startDate = yearMonth.atDay(1);
            LocalDate endDate = yearMonth.atEndOfMonth();
            
            // 한 번에 해당 기간의 공휴일 모두 조회
            List<Holiday> holidays = holidayRepository.findByHolidayDateBetween(startDate, endDate);
            log.info("공휴일 정보 조회 완료 - 개수: {}", holidays.size());
            
            // 날짜별로 공휴일 그룹화
            Map<LocalDate, List<Holiday>> holidaysByDate = holidays.stream()
                    .collect(Collectors.groupingBy(Holiday::getHolidayDate));
            
            // 해당 기간의 메뉴 조회
            List<Menu> menus = menuRepository.findBySchoolAndMenuDateBetweenOrderByMenuDate(
                    school, startDate, endDate);

            // 날짜별로 메뉴 그룹화
            Map<LocalDate, List<Menu>> menusByDate = menus.stream()
                    .collect(Collectors.groupingBy(Menu::getMenuDate));

            // 날짜별 DTO 생성
            List<MenuResponseDto.Days> daysList = new ArrayList<>();
            LocalDate currentDate = startDate;
            DateTimeFormatter formatter = DateTimeFormatter.ISO_DATE;

            while (!currentDate.isAfter(endDate)) {
                // 요일 이름
                DayOfWeek dayOfWeek = currentDate.getDayOfWeek();
                String dayOfWeekName = dayOfWeek.getDisplayName(TextStyle.SHORT, Locale.KOREAN);
                
                // 현재 날짜의 공휴일 정보 가져오기
                List<Holiday> dayHolidays = holidaysByDate.getOrDefault(currentDate, Collections.emptyList());
                
                if (!dayHolidays.isEmpty()) {
                    // 공휴일인 경우
                    List<String> holidayNames = dayHolidays.stream()
                        .map(Holiday::getHolidayName)
                        .collect(Collectors.toList());
                    
                    MenuResponseDto.Days day = MenuResponseDto.Days.builder()
                            .date(currentDate.format(formatter))
                            .dayOfWeekName(dayOfWeekName)
                            .holiday(holidayNames)
                            .menu(Collections.emptyList())
                            .build();
                    
                    daysList.add(day);
                } else {
                    // 공휴일이 아닌 경우 기존 로직 적용
                    List<Menu> dayMenus = menusByDate.getOrDefault(currentDate, Collections.emptyList());

                    // 메뉴 이름 목록 추출
                    List<String> menuNames = dayMenus.stream()
                            .map(Menu::getMenuName)
                            .collect(Collectors.toList());

                    // 카테고리별로 정렬된 메뉴 이름 목록
                    List<String> sortedMenuNames = sortMenusByCategory(menuNames, school, currentDate);

                    // 정렬된 메뉴 이름에 해당하는 Menu 엔티티 매핑
                    Map<String, Menu> menuMap = dayMenus.stream()
                            .collect(Collectors.toMap(
                                Menu::getMenuName,
                                menu -> menu,
                                (existing, replacement) -> existing
                            ));

                    // 정렬된 순서대로 MenuResponseDto.Menus 생성
                    List<MenuResponseDto.Menus> menusList = sortedMenuNames.stream()
                            .map(menuName -> {
                                Menu menu = menuMap.get(menuName);
                                return MenuResponseDto.Menus.builder()
                                        .menuId(menu.getId())
                                        .menuName(menu.getMenuName())
                                        .build();
                            })
                            .collect(Collectors.toList());

                    MenuResponseDto.Days day = MenuResponseDto.Days.builder()
                            .date(currentDate.format(formatter))
                            .dayOfWeekName(dayOfWeekName)
                            .menu(menusList)
                            .build();
                    
                    daysList.add(day);
                }
                
                currentDate = currentDate.plusDays(1);
            }

            MenuResponseDto responseDto = MenuResponseDto.builder()
                    .days(daysList)
                    .build();
            
            // 객체 내용 로깅을 위해 JSON으로 변환
            try {
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                mapper.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
                mapper.disable(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
                String jsonResponse = mapper.writeValueAsString(responseDto);
            } catch (Exception e) {
                log.error("응답 데이터 변환 중 오류: {}", e.getMessage());
            }
            
            return responseDto;
        } catch (Exception e) {
            log.error("메뉴 조회 중 오류 발생: {}", e.getMessage(), e);
            return ErrorResponseDto.of(BaperangErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Object getOneDayMenu(String token, String date) { 
        try {
            // 토큰 유효성
            if (!jwtService.validateToken(token)) {
                log.info("getOneDayMenu - 토큰 유효하지 않음");
                return ErrorResponseDto.of(BaperangErrorCode.INVALID_TOKEN);
            }

            Long userPk = jwtService.getUserId(token);

            User user = userRepository.findById(userPk)
                    .orElse(null);

            if (user == null) {
                log.info("getOneDayMenu - 사용자 정보 없음");
                return ErrorResponseDto.of(BaperangErrorCode.USER_NOT_FOUND);
            }

            School school = user.getSchool();
            LocalDate parsedDate = LocalDate.parse(date);

            List<String> menu = menuRepository.findDistinctMenuNamesBySchoolAndMenuDate(school, parsedDate);

            if (menu.isEmpty()) {
                log.info("getOneDayMenu - 해당 날짜 메뉴 없음");
                List<String> noMenuMessage = new ArrayList<>();
                noMenuMessage.add("해당 날짜에 메뉴가 없습니다.");
                return noMenuMessage;
            }

            // 카테고리별로 정렬된 메뉴
            List<String> sortedMenu = sortMenusByCategory(menu, school, parsedDate);
            
            // 총 칼로리 계산
            double totalCalories = 0.0;
            for (String menuName : menu) {
                try {
                    // 메뉴의 영양소 정보 조회
                    Menu dbMenu = menuRepository.findBySchoolAndMenuDateAndMenuName(school, parsedDate, menuName);
                    if (dbMenu != null) {
                        List<MenuNutrient> menuNutrients = menuNutrientRepository.findByMenu(dbMenu);
                        // 영양소 정보가 없으면
                        if (menuNutrients.isEmpty()) {
                            // 같은 이름의 다른 메뉴를 조회
                            List<Menu> sameNameMenus = menuRepository.findBySchoolAndMenuName(school, menuName);
                            for (Menu pastMenu : sameNameMenus) {
                                if (!pastMenu.getId().equals(dbMenu.getId())) {
                                    List<MenuNutrient> pastNutrients = menuNutrientRepository.findByMenu(pastMenu);
                                    if (!pastNutrients.isEmpty()) {
                                        menuNutrients = pastNutrients;
                                        break;
                                    }
                                }
                            }
                        }
                        
                        // 이후 열량 계산 로직은 동일하게 유지
                        for (MenuNutrient nutrient : menuNutrients) {
                            // "열량", "칼로리", "에너지" 등의 이름을 가진 영양소 찾기
                            String nutrientName = nutrient.getNutrient().getNutrientName();
                            if ("열량".equals(nutrientName) || "칼로리".equals(nutrientName) || "에너지".equals(nutrientName)) {
                                totalCalories += nutrient.getAmount();
                                break; // 칼로리 찾았으면 이 메뉴에 대한 루프 종료
                            }
                        }
                    }
                } catch (Exception e) {
                    log.warn("메뉴 '{}' 칼로리 조회 중 오류 발생: {}", menuName, e.getMessage());
                }
            }
            
            // 메뉴 목록과 총 칼로리를 포함한 응답 생성
            Map<String, Object> result = new HashMap<>();
            result.put("menu", sortedMenu);
            result.put("totalCalories", Math.round(totalCalories));
            
            log.info("getOneDayMenu - 메뉴 및 총 칼로리 조회 완료: {} kcal", Math.round(totalCalories));
            return result;
        } catch (Exception e) {
            log.error("오늘 메뉴 조회 중 오류 발생: {}", e.getMessage(), e);
            return ErrorResponseDto.of(BaperangErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Object getTodayMenu(String token) { 
        try {
            // 토큰 유효성
            if (!jwtService.validateToken(token)) {
                log.info("getOneDayMenu - 토큰 유효하지 않음");
                return ErrorResponseDto.of(BaperangErrorCode.INVALID_TOKEN);
            }

            Long userPk = jwtService.getUserId(token);

            LocalDate today = LocalDate.now();

            User user = userRepository.findById(userPk)
                    .orElse(null);

            if (user == null) {
                log.info("getOneDayMenu - 사용자 정보 없음");
                return ErrorResponseDto.of(BaperangErrorCode.USER_NOT_FOUND);
            }

            School school = user.getSchool();

            List<String> menu = menuRepository.findDistinctMenuNamesBySchoolAndMenuDate(school, today);

            if (menu.isEmpty()) {
                log.info("getOneDayMenu - 오늘 메뉴 없음");
                menu.add("오늘은 메뉴가 없습니다.");
                return menu;
            }

            // 카테고리별로 정렬된 메뉴 반환
            return sortMenusByCategory(menu, school, today);
        } catch (Exception e) {
            log.error("오늘 메뉴 조회 중 오류 발생: {}", e.getMessage(), e);
            return ErrorResponseDto.of(BaperangErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Object getMenuNutrient(String token, String menu, String date) {
        try {
            // 토큰 유효성
            if (!jwtService.validateToken(token)) {
                log.info("getMenuNutrient - 토큰 유효하지 않음");
                return ErrorResponseDto.of(BaperangErrorCode.INVALID_TOKEN);
            }

            Long userPk = jwtService.getUserId(token);
            log.info("getMenuNutrient - 사용자ID: {}", userPk);

            User user = userRepository.findById(userPk)
                    .orElse(null);

            if (user == null) {
                log.info("getMenuNutrient - 사용자 정보 없음");
                return ErrorResponseDto.of(BaperangErrorCode.USER_NOT_FOUND);
            }

            School school = user.getSchool();
            log.info("getMenuNutrient - 학교ID: {}", school.getId());
            
            LocalDate parsedDate;
            try {
                parsedDate = LocalDate.parse(date);
                log.info("getMenuNutrient - 날짜 파싱 성공: {}", parsedDate);
            } catch (Exception e) {
                log.error("getMenuNutrient - 날짜 파싱 실패: {}", e.getMessage());
                return ErrorResponseDto.of(BaperangErrorCode.INTERNAL_SERVER_ERROR);
            }

            // 해당 학교, 날짜에 맞는 모든 메뉴 조회
            List<Menu> allMenus = menuRepository.findBySchoolAndMenuDate(school, parsedDate);
            if (allMenus.isEmpty()) {
                log.info("getMenuNutrient - 해당 날짜에 메뉴가 없음");
            } else {
                log.info("getMenuNutrient - 해당 날짜의 전체 메뉴 목록:");
                for (Menu m : allMenus) {
                    log.info("  > 메뉴 ID: {}, 이름: '{}', 카테고리: {}", m.getId(), m.getMenuName(), m.getCategory());
                }
            }
            
            // 먼저 날짜와 학교에 맞는 메뉴 조회 (기존 코드 유지)
            Menu db_menu = menuRepository.findBySchoolAndMenuDateAndMenuName(school, parsedDate, menu);

            if (db_menu == null) {
                log.info("getMenuNutrient - 메뉴 조회 실패, DB에서 해당 메뉴를 찾을 수 없음");
                return ErrorResponseDto.of(BaperangErrorCode.MENU_NOT_FOUND);
            }
            
            log.info("getMenuNutrient - 메뉴 조회 성공: ID={}, Name='{}'", db_menu.getId(), db_menu.getMenuName());

            // 해당 메뉴의 영양소 정보 조회
            List<MenuNutrient> menuNutrients = menuNutrientRepository.findByMenu(db_menu);
            log.info("getMenuNutrient - 영양소 정보 조회 완료, 개수: {}", menuNutrients.size());
            
            try {
                // 메뉴 엔티티의 getNutrientInfo 메서드를 통해 영양소 정보 반환
                Object result = db_menu.getNutrientInfo(menuNutrients);
                log.info("getMenuNutrient - 영양소 정보 변환 성공");
                return result;
            } catch (Exception e) {
                log.error("getMenuNutrient - 영양소 정보 변환 중 오류: {}", e.getMessage());
                log.error("Stack trace: ", e);
                return ErrorResponseDto.of(BaperangErrorCode.INTERNAL_SERVER_ERROR);
            }

        } catch (Exception e) {
            log.error("메뉴 영양소 조회 중 오류 발생: {}", e.getMessage());
            log.error("Stack trace: ", e);
            return ErrorResponseDto.of(BaperangErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    @Override
    @Transactional
    public Object makeMonthMenu(String token) {
        try {
            // 토큰 유효성
            if (!jwtService.validateToken(token)) {
                log.info("makeMonthMenu - 토큰 유효하지 않음");
                return ErrorResponseDto.of(BaperangErrorCode.INVALID_TOKEN);
            }

            Long userPk = jwtService.getUserId(token);
            User user = userRepository.findById(userPk)
                    .orElse(null);

            if (user == null) {
                log.info("makeMonthMenu - 사용자 정보 없음");
                return ErrorResponseDto.of(BaperangErrorCode.USER_NOT_FOUND);
            }

            School school = user.getSchool();

            Integer schoolMakeMonth = school.getMakeMonth();
            if (schoolMakeMonth != null && schoolMakeMonth == LocalDate.now().getMonthValue()) {
                log.info("makeMonthMenu - 이미 메뉴 생성 완료");
                return ErrorResponseDto.of(BaperangErrorCode.ALREADY_MADE_MENU);
            }

            // 다음 달의 년도와 월 계산
            LocalDate today = LocalDate.now();
            LocalDate nextMonth = today.plusMonths(1);
            Integer year = nextMonth.getYear();
            Integer month = nextMonth.getMonthValue();
            
            // 다음 달의 시작일과 마지막 일 계산
            YearMonth nextYearMonth = YearMonth.of(year, month);
            LocalDate startDate = nextYearMonth.atDay(1);
            LocalDate endDate = nextYearMonth.atEndOfMonth();
            
            // Update the makeMonth field
            school.updateMakeMonth(month);
            
            // 다음 달에 이미 메뉴가 있는지 확인
            List<Menu> nextMonthMenus = menuRepository.findBySchoolAndMenuDateBetweenOrderByMenuDate(
                school, startDate, endDate);
            
            if (!nextMonthMenus.isEmpty()) {
                log.info("makeMonthMenu - 다음 달({}/{})에 이미 생성된 메뉴가 있습니다. 메뉴 개수: {}", 
                    year, month, nextMonthMenus.size());
                
                // 이미 메뉴가 있다는 메시지만 반환
                Map<String, String> messageResponse = new HashMap<>();
                messageResponse.put("message", "이미 다음 달 메뉴가 생성되어 있습니다.");
                
                return messageResponse;
            }
            
            // 다음 달의 공휴일 조회
            List<Holiday> holidays = holidayRepository.findByHolidayDateBetween(startDate, endDate);
            log.info("다음 달 공휴일 정보 조회 완료 - 개수: {}", holidays.size());
            
            // 공휴일 정보 설정
            Map<String, String> holidayMap = new HashMap<>();
            DateTimeFormatter formatter = DateTimeFormatter.ISO_DATE;
            
            for (Holiday holiday : holidays) {
                String dateStr = holiday.getHolidayDate().format(formatter);
                holidayMap.put(dateStr, holiday.getHolidayName());
            }
            
            // 메뉴 풀 데이터를 카테고리별로 구성
            Map<String, String> menuPool = new HashMap<>();
            // 메뉴별 양 정보를 저장하는 맵
            Map<String, Integer> menuAmountMap = new HashMap<>();
            
            // 모든 메뉴 데이터 조회 (전체 데이터)
            List<Menu> allMenus = menuRepository.findBySchool(school);
            
            // 메뉴 ID 목록 추출
            List<Long> menuIds = allMenus.stream()
                    .map(Menu::getId)
                    .collect(Collectors.toList());
            
            // 영양소 정보 일괄 조회 및 메뉴 ID별로 그룹화
            Map<Long, List<MenuNutrient>> nutrientsByMenuId = new HashMap<>();
            if (!menuIds.isEmpty()) {
                List<MenuNutrient> allNutrients = menuNutrientRepository.findByMenuIdIn(menuIds);
                log.info("모든 메뉴의 영양소 정보 일괄 조회 완료 - 개수: {}", allNutrients.size());
                
                // 메뉴 ID별로 영양소 정보 그룹화
                nutrientsByMenuId = allNutrients.stream()
                        .collect(Collectors.groupingBy(nutrient -> nutrient.getMenu().getId()));
            }
            
            // menuData 구조 생성 및 기존 메뉴 데이터로 채우기
            Map<String, Map<String, MenuPlanRequestDto.MenuDetailDto>> menuData = new HashMap<>();
            
            // 카테고리별 메뉴 풀 구성 및 메뉴별 양 정보 저장
            for (Menu menu : allMenus) {
                String menuName = menu.getMenuName();
                
                // 메뉴 풀에 추가 (메뉴이름 -> 카테고리)
                if (!menuPool.containsKey(menuName)) {
                    menuPool.put(menuName, menu.getCategory());
                }
                
                // 메뉴별 양 정보 저장 (이미 있는 경우 업데이트하지 않음)
                if (!menuAmountMap.containsKey(menuName) && menu.getAmount() != null) {
                    menuAmountMap.put(menuName, menu.getAmount());
                }
                
                // 메뉴 데이터 구성
                String dateStr = menu.getMenuDate().format(formatter);
                if (!menuData.containsKey(dateStr)) {
                    menuData.put(dateStr, new HashMap<>());
                }
                
                Map<String, MenuPlanRequestDto.MenuDetailDto> dayMenus = menuData.get(dateStr);
                
                // 영양소 정보 맵 구성 (미리 조회한 데이터 활용)
                Map<String, Double> nutritionMap = new HashMap<>();
                List<MenuNutrient> nutrients = nutrientsByMenuId.getOrDefault(menu.getId(), Collections.emptyList());
                for (MenuNutrient nutrient : nutrients) {
                    nutritionMap.put(
                        nutrient.getNutrient().getNutrientName(),
                        nutrient.getAmount().doubleValue()
                    );
                }
                
                // 메뉴별 잔반율 계산 (amount 필드 사용, 없으면 기본값)
                double leftover = (menu.getAmount() != null && menu.getAmount() > 0) 
                    ? (double) menu.getAmount() / 1000  // 1000 단위로 정규화 (0~1 사이로 변환)
                    : 0.2; // 기본 잔반율
                
                // 메뉴별 선호도 계산 (favorite 필드 사용, 없으면 기본값)
                double preference = (menu.getFavorite() != null) 
                    ? menu.getFavorite().doubleValue()  
                    : 3.0; // 기본 선호도 (5점 만점)
                
                // 메뉴 데이터에 추가
                dayMenus.put(menuName, MenuPlanRequestDto.MenuDetailDto.builder()
                        .leftover(leftover)
                        .preference(preference)
                        .nutrition(nutritionMap)
                        .build());
            }
            
            // 다음 달의 각 날짜에 대한 빈 맵 생성 (없는 경우)
            for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
                String dateStr = date.format(formatter);
                if (!menuData.containsKey(dateStr)) {
                    menuData.put(dateStr, new HashMap<>());
                }
            }
            
            // MenuPlanRequestDto 생성
            Map<String, Object> requestMap = new HashMap<>();
            requestMap.put("menuData", menuData);
            requestMap.put("menuPool", menuPool);
            requestMap.put("holidays", holidayMap);
            
            String aiServerUrl = aiServerBaseUrl + MENU_PLAN_ENDPOINT;

            RestTemplate restTemplate = new RestTemplate();
            ResponseEntity<Map> response = restTemplate.postForEntity(aiServerUrl, requestMap, Map.class);
            
            if (!response.getStatusCode().is2xxSuccessful()) {
                log.error("makeMonthMenu - AI 서버 응답 실패: {}", response.getStatusCode());
                return ErrorResponseDto.of(BaperangErrorCode.INTERNAL_SERVER_ERROR);
            }
            
            // AI 서버 응답 처리
            Map<String, Object> responseBody = response.getBody();
            if (responseBody == null) {
                log.error("makeMonthMenu - AI 서버 응답 내용 없음");
                return ErrorResponseDto.of(BaperangErrorCode.INTERNAL_SERVER_ERROR);
            }
            
            // 응답 DTO 생성
            List<MenuPlanResponseDto.DayMenu> dayMenusList = new ArrayList<>();
            
            @SuppressWarnings("unchecked")
            Map<String, Object> plan = (Map<String, Object>) responseBody.get("plan");
            if (plan == null) {
                log.error("makeMonthMenu - 메뉴 계획 정보 없음");
                return ErrorResponseDto.of(BaperangErrorCode.INTERNAL_SERVER_ERROR);
            }
            
            // 각 날짜별 메뉴 처리 (메뉴 일괄 저장을 위한 리스트)
            List<Menu> menusToSave = new ArrayList<>();
            
            // 각 날짜별 메뉴 처리
            for (Map.Entry<String, Object> entry : plan.entrySet()) {
                String dateStr = entry.getKey();
                
                // 공휴일인 경우 스킵
                if (holidayMap.containsKey(dateStr)) {
                    continue;
                }
                
                LocalDate menuDate = LocalDate.parse(dateStr);
                
                // 주말인 경우 스킵
                DayOfWeek dayOfWeek = menuDate.getDayOfWeek();
                if (dayOfWeek == DayOfWeek.SATURDAY || dayOfWeek == DayOfWeek.SUNDAY) {
                    continue;
                }
                
                @SuppressWarnings("unchecked")
                Map<String, Object> dayMenus = (Map<String, Object>) entry.getValue();
                if (dayMenus == null || dayMenus.isEmpty()) {
                    continue;
                }
                
                List<String> menuInfoList = new ArrayList<>();
                
                // 해당 날짜의 각 메뉴 처리
                for (Map.Entry<String, Object> menuEntry : dayMenus.entrySet()) {
                    String menuName = menuEntry.getKey();
                    
                    @SuppressWarnings("unchecked")
                    Map<String, Object> menuDetail = (Map<String, Object>) menuEntry.getValue();
                    
                    // 카테고리 가져오기 (AI 응답에서 제공하거나, 없으면 풀에서 가져오기)
                    String category = (menuDetail != null && menuDetail.containsKey("category")) 
                        ? (String) menuDetail.get("category") 
                        : menuPool.getOrDefault(menuName, "기타");
                    
                    // 메뉴 양 조회 (기존 데이터에서 가져오거나 없으면 0)
                    Integer amount = menuAmountMap.getOrDefault(menuName, 0);
                    
                    // 모든 메뉴에서 해당 이름의 메뉴를 찾아 amount 값이 있는지 확인
                    if (amount == 0) {
                        for (Menu existingMenu : allMenus) {
                            if (existingMenu.getMenuName().equals(menuName) && 
                                existingMenu.getAmount() != null && 
                                existingMenu.getAmount() > 0) {
                                amount = existingMenu.getAmount();
                                break;
                            }
                        }
                    }
                    
                    // 대체 메뉴 정보 추출
                    List<String> alternatives = new ArrayList<>();
                    if (menuDetail != null && menuDetail.containsKey("alternatives")) {
                        @SuppressWarnings("unchecked")
                        List<String> alts = (List<String>) menuDetail.get("alternatives");
                        if (alts != null) {
                            alternatives.addAll(alts);
                        }
                    }
                    
                    // 메뉴 생성 (아직 저장하지 않음)
                    Menu menu = Menu.builder()
                            .school(school)
                            .menuDate(menuDate)
                            .menuName(menuName)
                            .category(category)
                            .amount(amount)
                            .favorite(0.0f)
                            .votes(0)
                            .alternatives(alternatives)
                            .build();
                    
                    // 저장할 메뉴 리스트에 추가
                    menusToSave.add(menu);
                    
                    // 응답 DTO에 메뉴 이름 추가
                    menuInfoList.add(menuName);
                }
                
                // 응답 DTO에 날짜별 메뉴 추가
                MenuPlanResponseDto.DayMenu dayMenu = MenuPlanResponseDto.DayMenu.builder()
                        .date(dateStr)
                        .menus(menuInfoList)
                        .build();
                
                dayMenusList.add(dayMenu);
            }
            
            // 메뉴 일괄 저장 (한 번의 트랜잭션으로 처리)
            if (!menusToSave.isEmpty()) {
                menuRepository.saveAll(menusToSave);
                log.info("makeMonthMenu - 메뉴 일괄 저장 완료: {} 개", menusToSave.size());
            }
            
            // 최종 응답 DTO 생성
            MenuPlanResponseDto responseDto = MenuPlanResponseDto.builder()
                    .dayMenus(dayMenusList)
                    .build();
            
            log.info("makeMonthMenu - 메뉴 생성 및 저장 완료: {} 일치 처리됨", dayMenusList.size());
            return responseDto;
            
        } catch (Exception e) {
            log.error("메뉴 생성 중 오류 발생: {}", e.getMessage(), e);
            return ErrorResponseDto.of(BaperangErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Object getAlternatives(String token, String menu, String date) {
        try {
            // 토큰 유효성
            if (!jwtService.validateToken(token)) {
                log.info("getAlternatives - 토큰 유효하지 않음");
                return ErrorResponseDto.of(BaperangErrorCode.INVALID_TOKEN);
            }

            Long userPk = jwtService.getUserId(token);
            User user = userRepository.findById(userPk)
                    .orElse(null);

            if (user == null) {
                log.info("getAlternatives - 사용자 정보 없음");
                return ErrorResponseDto.of(BaperangErrorCode.USER_NOT_FOUND);
            }

            School school = user.getSchool();

            LocalDate menuDate = LocalDate.parse(date);

            // 해당 메뉴 찾기
            Menu menuItem = menuRepository.findBySchoolAndMenuDateAndMenuName(school, menuDate, menu);
            
            if (menuItem == null) {
                log.info("getAlternatives - 해당 메뉴를 찾을 수 없음: {}", menu);
                return ErrorResponseDto.of(BaperangErrorCode.MENU_NOT_FOUND);
            }

            // 대체 메뉴 리스트 가져오기
            List<String> alternatives = menuItem.getAlternatives();
            
            if (alternatives == null || alternatives.isEmpty()) {
                log.info("getAlternatives - 대체 메뉴가 없음");
                Map<String, Object> response = new HashMap<>();
                response.put("message", "대체 메뉴가 없습니다.");
                response.put("alternatives", Collections.emptyList());
                return response;
            }
            
            log.info("getAlternatives - 대체 메뉴 조회 성공: {} 개", alternatives.size());
            Map<String, Object> response = new HashMap<>();
            response.put("alternatives", alternatives);
            return response;
            
        } catch (Exception e) {
            log.error("대체 메뉴 조회 중 오류 발생: {}", e.getMessage(), e);
            return ErrorResponseDto.of(BaperangErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    @Override
    @Transactional
    public Object updateMenu(String token, String menu, String date, String alternative_menu) {
        try {
            // 토큰 유효성
            if (!jwtService.validateToken(token)) {
                log.info("updateMenu - 토큰 유효하지 않음");
                return ErrorResponseDto.of(BaperangErrorCode.INVALID_TOKEN);
            }

            Long userPk = jwtService.getUserId(token);
            User user = userRepository.findById(userPk)
                    .orElse(null);

            if (user == null) {
                log.info("updateMenu - 사용자 정보 없음");
                return ErrorResponseDto.of(BaperangErrorCode.USER_NOT_FOUND);
            }

            School school = user.getSchool();
            
            LocalDate menuDate = LocalDate.parse(date);

            Menu menuItem = menuRepository.findBySchoolAndMenuDateAndMenuName(school, menuDate, menu);

            if (menuItem == null) {
                log.info("updateMenu - 해당 메뉴를 찾을 수 없음: {}", menu);
                return ErrorResponseDto.of(BaperangErrorCode.MENU_NOT_FOUND);
            }

            // 대체 메뉴 리스트 확인
            List<String> alternatives = menuItem.getAlternatives();
            if (alternatives == null || alternatives.isEmpty() || !alternatives.contains(alternative_menu)) {
                log.info("updateMenu - 대체 메뉴로 지정된 메뉴가 아님: {}", alternative_menu);
                Map<String, String> response = new HashMap<>();
                response.put("message", "대체 메뉴로 지정된 메뉴가 아닙니다.");
                return response;
            }
            
            // 대체 메뉴의 amount 조회 시도
            Integer newAmount = menuItem.getAmount(); // 기본값으로 현재 메뉴의 양 사용
            
            // 기존에 대체 메뉴가 DB에 있는지 확인하여 해당 메뉴의 amount 값 가져오기
            List<Menu> existingMenus = menuRepository.findBySchoolAndMenuName(school, alternative_menu);
            if (!existingMenus.isEmpty()) {
                // 가장 최근 메뉴의 amount 값 사용
                Menu recentMenu = existingMenus.stream()
                        .sorted((m1, m2) -> m2.getMenuDate().compareTo(m1.getMenuDate()))
                        .findFirst()
                        .orElse(null);
                
                if (recentMenu != null && recentMenu.getAmount() != null) {
                    newAmount = recentMenu.getAmount();
                    log.info("updateMenu - 대체 메뉴 기존 amount 값 찾음: {}", newAmount);
                }
            }
            
            // 대체 메뉴 목록 업데이트 (현재 메뉴를 대체 메뉴로 넣고, 선택한 대체 메뉴 제거)
            List<String> newAlternatives = new ArrayList<>(alternatives);
            newAlternatives.remove(alternative_menu); // 선택한 대체 메뉴 제거
            if (!newAlternatives.contains(menu)) {
                newAlternatives.add(menu); // 원래 메뉴를 대체 메뉴로 추가
            }
            
            // 메뉴 업데이트
            menuItem.updateMenuName(alternative_menu);
            menuItem.updateAmount(newAmount);
            menuItem.updateAlternatives(newAlternatives);
            
            // DB 저장 (트랜잭션으로 인해 자동 저장)
            log.info("updateMenu - 메뉴 업데이트 완료: {} -> {}", menu, alternative_menu);
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "메뉴가 성공적으로 변경되었습니다.");
            response.put("menuName", alternative_menu);
            response.put("alternatives", newAlternatives);
            
            return response;
                
        } catch (Exception e) {
            log.error("메뉴 수정 중 오류 발생: {}", e.getMessage(), e);
            return ErrorResponseDto.of(BaperangErrorCode.INTERNAL_SERVER_ERROR);
        }
    }
    
    private List<String> sortMenusByCategory(List<String> menus, School school, LocalDate date) {
        // 지정된 날짜의 모든 메뉴 엔티티 조회
        List<Menu> menuEntities = menuRepository.findBySchoolAndMenuDate(school, date);
        
        // 카테고리별 우선순위 맵
        Map<String, Integer> categoryPriority = new HashMap<>();
        categoryPriority.put("rice", 1);
        categoryPriority.put("soup", 2);
        categoryPriority.put("main", 3);
        categoryPriority.put("side", 4);
        
        // 메뉴 이름 -> 카테고리 매핑
        Map<String, String> menuToCategory = menuEntities.stream()
            .collect(Collectors.toMap(
                Menu::getMenuName,
                Menu::getCategory,
                (existing, replacement) -> existing
            ));
        
        // 정렬된 메뉴 리스트 생성
        return menus.stream()
            .sorted((menu1, menu2) -> {
                String category1 = menuToCategory.getOrDefault(menu1, "side");
                String category2 = menuToCategory.getOrDefault(menu2, "side");
                
                int priority1 = categoryPriority.getOrDefault(category1, 5);
                int priority2 = categoryPriority.getOrDefault(category2, 5);
                
                return Integer.compare(priority1, priority2);
            })
            .collect(Collectors.toList());
    }
}