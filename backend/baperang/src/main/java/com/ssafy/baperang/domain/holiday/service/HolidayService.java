package com.ssafy.baperang.domain.holiday.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.http.ResponseEntity;
import com.ssafy.baperang.domain.holiday.entity.Holiday;

public interface HolidayService {    // 특정 년월의 공휴일 정보를 API에서 가져와 DB에 저장
    ResponseEntity<?> fetchAndSaveHolidays(String year, String month);
    
    // 특정 기간 내의 공휴일 목록 조회
    List<Holiday> getHolidaysBetween(int year, int month);
}
