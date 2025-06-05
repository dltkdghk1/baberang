package com.ssafy.baperang.domain.holiday.service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import com.ssafy.baperang.domain.holiday.entity.Holiday;
import com.ssafy.baperang.domain.holiday.repository.HolidayRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.StringReader;
import org.xml.sax.InputSource;

@Slf4j
@Service
@RequiredArgsConstructor
public class HolidayServiceImpl implements HolidayService {

    private final HolidayRepository holidayRepository;
    private final String API_KEY = "Hkw%2BZHhSmEkADxkFrvX6ZCkDRd1r9kaWpE%2Feh764ywn1qGIjxd1gSyw9y%2BsObKK8OcLeOSCudQaHzf3hVfxA5w%3D%3D";
    private final String API_URL = "https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getHoliDeInfo";

    @Override
    @Transactional
    public ResponseEntity<?> fetchAndSaveHolidays(String year, String month) {
        try {
            RestTemplate restTemplate = new RestTemplate();
            String formattedMonth = String.format("%02d", Integer.parseInt(month));
            
            // 파라미터 이름을 serviceKey로 변경 (대소문자 구분)
            String url = API_URL + "?ServiceKey=" + API_KEY + "&solYear=" + year + "&solMonth=" + formattedMonth;
            
            log.info("API URL: {}", url);
            String xmlResponse = restTemplate.getForObject(url, String.class);
            log.info("API 응답: {}", xmlResponse);
            
            // API 에러 응답 체크
            if (xmlResponse.contains("SERVICE ERROR") || xmlResponse.contains("returnAuthMsg")) {
                log.error("API 호출 에러: {}", xmlResponse);
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                        .body("공공데이터포털 API 호출 중 오류가 발생했습니다: " + 
                              xmlResponse.replaceAll("<[^>]*>", " ").replaceAll("\\s+", " ").trim());
            }
            
            // 공휴일 정보 파싱 및 저장/업데이트
            List<Holiday> savedOrUpdatedHolidays = parseAndSaveHolidays(xmlResponse);
            
            if (savedOrUpdatedHolidays.isEmpty()) {
                return ResponseEntity.ok(year + "년 " + month + "월에 공휴일이 없거나, 모든 공휴일 정보가 최신 상태입니다.");
            } else {
                return ResponseEntity.ok(savedOrUpdatedHolidays.size() + "개의 공휴일이 추가 또는 업데이트되었습니다.");
            }
        } catch (Exception e) {
            log.error("공휴일 데이터 가져오기 및 저장 중 오류 발생: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("공휴일 정보를 가져오는 중 오류가 발생했습니다: " + e.getMessage());
        }
    }

    private List<Holiday> parseAndSaveHolidays(String xmlResponse) {
        List<Holiday> savedOrUpdatedHolidays = new ArrayList<>();
        
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            DocumentBuilder builder = factory.newDocumentBuilder();
            Document document = builder.parse(new InputSource(new StringReader(xmlResponse)));
            
            // <item> 태그 찾기
            NodeList itemList = document.getElementsByTagName("item");
            
            for (int i = 0; i < itemList.getLength(); i++) {
                Node item = itemList.item(i);
                
                if (item.getNodeType() == Node.ELEMENT_NODE) {
                    Element element = (Element) item;
                    
                    // 필요한 정보 추출
                    String dateName = getTagValue("dateName", element);
                    String isHoliday = getTagValue("isHoliday", element);
                    String locdate = getTagValue("locdate", element);
                    
                    // 휴일인 경우에만 처리 (isHoliday가 "Y"인 경우)
                    if ("Y".equals(isHoliday)) {
                        // locdate 형식: YYYYMMDD
                        LocalDate holidayDate = LocalDate.parse(locdate, DateTimeFormatter.ofPattern("yyyyMMdd"));
                        
                        try {
                            // 이미 존재하는지 날짜와 이름으로 확인 (같은 날짜에 다른 공휴일은 허용)
                            if (holidayRepository.existsByHolidayDateAndHolidayName(holidayDate, dateName)) {
                                // 기존 공휴일 정보 조회
                                Holiday existingHoliday = holidayRepository.findByHolidayDateAndHolidayName(holidayDate, dateName)
                                        .orElseThrow(() -> new RuntimeException("예상치 못한 오류: 공휴일이 존재하지만 조회할 수 없습니다."));
                                
                                // 이미 같은 이름, 같은 날짜의 공휴일이 존재하므로 변경 없음
                                log.info("공휴일 정보 변경 없음: {}, {}", existingHoliday.getHolidayName(), existingHoliday.getHolidayDate());
                            } else {
                                // 새 공휴일 추가
                                Holiday holiday = Holiday.builder()
                                        .holidayName(dateName)
                                        .holidayDate(holidayDate)
                                        .build();
                                
                                Holiday savedHoliday = holidayRepository.save(holiday);
                                savedOrUpdatedHolidays.add(savedHoliday);
                                log.info("새 공휴일 저장: {}, {}", savedHoliday.getHolidayName(), savedHoliday.getHolidayDate());
                            }
                        } catch (Exception e) {
                            log.error("공휴일 저장/업데이트 중 오류 발생: {}", e.getMessage());
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("XML 파싱 중 오류 발생: {}", e.getMessage());
        }
        
        return savedOrUpdatedHolidays;
    }
    
    private String getTagValue(String tag, Element element) {
        NodeList nodeList = element.getElementsByTagName(tag);
        if (nodeList.getLength() > 0 && nodeList.item(0).getChildNodes().getLength() > 0) {
            return nodeList.item(0).getChildNodes().item(0).getNodeValue();
        }
        return "";
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<Holiday> getHolidaysBetween(int year, int month) {
        log.info("월별 공휴일 조회: {}년 {}월", year, month);
        
        // 모든 공휴일 조회
        List<Holiday> allHolidays = holidayRepository.findAll();
        
        // 날짜순으로 정렬 (오래된 날짜부터)
        allHolidays.sort((h1, h2) -> h1.getHolidayDate().compareTo(h2.getHolidayDate()));
        
        List<Holiday> result = new ArrayList<>();
        
        for (Holiday holiday : allHolidays) {
            int holidayYear = holiday.getHolidayDate().getYear();
            int holidayMonth = holiday.getHolidayDate().getMonthValue();
            
            // 목표 연도, 목표 월에 해당하는 모든 공휴일 추가
            if (holidayYear == year && holidayMonth == month) {
                result.add(holiday);
            }
        }
        
        log.info("{}년 {}월 공휴일 검색 결과: {}개 발견", year, month, result.size());
        
        return result;
    }
}