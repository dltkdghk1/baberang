package com.ssafy.baperang.domain.menu.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.baperang.domain.menu.entity.Menu;
import com.ssafy.baperang.domain.menu.repository.MenuRepository;
//import com.ssafy.baperang.domain.menunutrient.entity.MenuNutrient;
//import com.ssafy.baperang.domain.menunutrient.repository.MenuNutrientRepository;
//import com.ssafy.baperang.domain.nutrient.entity.Nutrient;
//import com.ssafy.baperang.domain.nutrient.repository.NutrientRepository;
import com.ssafy.baperang.domain.school.entity.School;
import com.ssafy.baperang.domain.school.repository.SchoolRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class MenuImportServiceImpl implements MenuImportService {

    private final MenuRepository menuRepository;
//    private final NutrientRepository nutrientRepository;
//    private final MenuNutrientRepository menuNutrientRepository;
    private final SchoolRepository schoolRepository;
    private final ObjectMapper objectMapper;

    /**
     * 엑셀 파일을 JSON 형식으로 변환
     */
    @Override
    public String convertExcelToJson(MultipartFile file) throws IOException {
        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            return processWorkbookToJson(workbook);
        }
    }

    /**
     * 바이트 배열에서 엑셀 파일을 JSON 형식으로 변환
     */
    public String convertExcelToJsonFromBytes(byte[] fileData) throws IOException {
        try (InputStream inputStream = new ByteArrayInputStream(fileData);
             Workbook workbook = new XSSFWorkbook(inputStream)) {
            return processWorkbookToJson(workbook);
        }
    }

    /**
     * 워크북을 처리하여 JSON으로 변환
     */
    private String processWorkbookToJson(Workbook workbook) throws IOException {
        List<Map<String, Object>> dataList = new ArrayList<>();

        // 첫 번째 시트만 처리
        Sheet sheet = workbook.getSheetAt(0);

        // 헤더 행 처리
        Row headerRow = sheet.getRow(0);
        if (headerRow == null) {
            return objectMapper.writeValueAsString(dataList);
        }

        // 헤더 컬럼명 추출
        List<String> headers = new ArrayList<>();
        for (Cell cell : headerRow) {
            headers.add(getCellStringValue(cell));
        }

        log.info("엑셀 헤더: {}", headers);

        // 데이터 행 처리
        for (int i = 1; i <= sheet.getLastRowNum(); i++) {
            Row row = sheet.getRow(i);
            if (row == null) continue;

            Map<String, Object> rowData = new HashMap<>();
            boolean hasData = false;

            for (int j = 0; j < headers.size(); j++) {
                Cell cell = row.getCell(j);
                if (cell == null) continue;

                String header = headers.get(j);
                Object value = getCellValue(cell);

                if (value != null) {
                    rowData.put(header, value);
                    hasData = true;
                }
            }

            if (hasData) {
                dataList.add(rowData);
            }
        }

        log.info("엑셀 데이터 파싱 완료: {}개 행 처리됨", dataList.size());
        return objectMapper.writeValueAsString(dataList);
    }

    /**
     * 셀 값을 문자열로 반환
     */
    private String getCellStringValue(Cell cell) {
        if (cell == null) return "";

        cell.setCellType(CellType.STRING);
        return cell.getStringCellValue().trim();
    }

    /**
     * 셀 값을 적절한 타입으로 반환
     */
    private Object getCellValue(Cell cell) {
        if (cell == null) return null;

        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue().trim();
            case NUMERIC:
                if (DateUtil.isCellDateFormatted(cell)) {
                    return cell.getLocalDateTimeCellValue().toLocalDate();
                } else {
                    double value = cell.getNumericCellValue();
                    // 정수값이면 정수로 반환, 아니면 실수로 반환
                    if (value == Math.floor(value)) {
                        return (int) value;
                    }
                    return value;
                }
            case BOOLEAN:
                return cell.getBooleanCellValue();
            case FORMULA:
                try {
                    cell.setCellType(CellType.STRING);
                    return cell.getStringCellValue().trim();
                } catch (Exception e) {
                    try {
                        return cell.getNumericCellValue();
                    } catch (Exception ex) {
                        return null;
                    }
                }
            default:
                return null;
        }
    }

    /**
     * JSON 데이터를 파싱하여 DB에 저장
     */
    @Override
    @Transactional
    public void importMenusFromJson(String jsonData, Long schoolId) throws IOException {
        // 학교 정보 조회
        School school = schoolRepository.findById(schoolId)
                .orElseThrow(() -> new IllegalArgumentException("학교 ID를 찾을 수 없습니다: " + schoolId));

        // JSON 파싱
        List<Map<String, Object>> dataList = objectMapper.readValue(jsonData,
                objectMapper.getTypeFactory().constructCollectionType(List.class, Map.class));

        log.info("총 {}개의 데이터를 처리합니다.", dataList.size());

        int savedMenuCount = 0;
        // 데이터 처리 및 저장
        for (Map<String, Object> data : dataList) {
            if (processMenuData(data, school)) {
                savedMenuCount++;
            }
        }

        log.info("✅ 신규 메뉴 {}건 저장 완료", savedMenuCount);
    }

    /**
     * 메뉴 데이터 처리 및 저장
     * @return 메뉴 저장 성공 여부
     */
    private boolean processMenuData(Map<String, Object> data, School school) {
        try {
            // 엑셀 컬럼에 맞게 데이터 추출
            String city = getStringValue(data.get("city"));
            String schoolName = getStringValue(data.get("school"));
            String menuName = getStringValue(data.get("menu_name"));
            LocalDate menuDate = parseDate(data.get("menu_date"));

            // 필수 데이터 확인
            if (menuName.isEmpty() || menuDate == null) {
                log.warn("메뉴명 또는 날짜가 없는 데이터를 건너뜁니다.");
                return false;
            }

            // 이미 존재하는 메뉴인지 확인
            if (menuRepository.existsBySchoolAndMenuDateAndMenuName(school, menuDate, menuName)) {
                log.info("이미 존재하는 메뉴입니다: {} ({})", menuName, menuDate);
                return false;
            }

            // 메뉴 엔티티 생성 및 저장
            Menu menu = Menu.builder()
                    .school(school)
                    .menuDate(menuDate)
                    .menuName(menuName)
//                    .favorite(0.0f) // 기본값으로 0 설정
                    .build();

            menu = menuRepository.saveAndFlush(menu);
            log.info("메뉴 저장 완료: {} ({})", menuName, menuDate);

            return true;

        } catch (Exception e) {
            log.error("메뉴 데이터 처리 중 오류 발생: {}", e.getMessage(), e);
            return false;
        }
    }

    /**
     * 문자열 값 추출
     */
    private String getStringValue(Object value) {
        return value != null ? value.toString().trim() : "";
    }

    /**
     * 날짜 파싱
     */
    private LocalDate parseDate(Object value) {
        if (value == null) {
            return null;
        }

        if (value instanceof LocalDate) {
            return (LocalDate) value;
        }

        String dateStr = value.toString().trim();

        // YYYYMMDD 형식 처리
        try {
            if (dateStr.length() == 8 && dateStr.matches("\\d{8}")) {
                return LocalDate.parse(dateStr, DateTimeFormatter.ofPattern("yyyyMMdd"));
            }
        } catch (Exception e) {
            // 다른 형식 시도
        }

        // 다양한 날짜 형식 시도
        DateTimeFormatter[] formatters = {
                DateTimeFormatter.ofPattern("yyyy-MM-dd"),
                DateTimeFormatter.ofPattern("yyyy/MM/dd"),
                DateTimeFormatter.ofPattern("yyyy.MM.dd")
        };

        for (DateTimeFormatter formatter : formatters) {
            try {
                return LocalDate.parse(dateStr, formatter);
            } catch (Exception e) {
                // 다음 포맷 시도
            }
        }

        log.warn("날짜 형식을 파싱할 수 없습니다: {}", dateStr);
        return null;
    }
}