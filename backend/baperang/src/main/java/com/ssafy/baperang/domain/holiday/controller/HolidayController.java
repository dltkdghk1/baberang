package com.ssafy.baperang.domain.holiday.controller;

import com.ssafy.baperang.domain.holiday.entity.Holiday;
import com.ssafy.baperang.domain.holiday.service.HolidayService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/holidays")
public class HolidayController {

    private final HolidayService holidayService;

    /**
     * 공휴일 API 호출 및 DB 저장
     * @param year 년도 (예: 2023)
     * @param month 월 (예: 01, 1, 12)
     * @return 저장 결과
     */
    @GetMapping("/sync")
    public ResponseEntity<?> syncHolidays(
            @RequestParam(required = true) String year,
            @RequestParam(required = true) String month) {
        log.info("공휴일 동기화 요청: {}년 {}월", year, month);
        return holidayService.fetchAndSaveHolidays(year, month);
    }

    /**
     * 특정 년월의 공휴일 목록 조회
     * @param year 년도 (예: 2023)
     * @param month 월 (1-12)
     * @return 해당 월의 공휴일 목록
     */
    @GetMapping("/month")
    public ResponseEntity<?> getHolidaysByMonth(
            @RequestParam int year,
            @RequestParam int month) {
        log.info("월별 공휴일 조회 요청: {}년 {}월", year, month);
        
        List<Holiday> holidays = holidayService.getHolidaysBetween(year, month);
        return ResponseEntity.ok(holidays);
    }
} 