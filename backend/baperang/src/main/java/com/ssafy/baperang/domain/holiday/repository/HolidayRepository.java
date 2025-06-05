package com.ssafy.baperang.domain.holiday.repository;

import com.ssafy.baperang.domain.holiday.entity.Holiday;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface HolidayRepository {
    Holiday save(Holiday holiday);
    List<Holiday> findAll();
    Optional<Holiday> findById(Long id);
    
    // 특정 날짜의 모든 공휴일 조회
    List<Holiday> findByHolidayDate(LocalDate date);
    
    // 특정 기간의 모든 공휴일 조회
    List<Holiday> findByHolidayDateBetween(LocalDate startDate, LocalDate endDate);
    
    // 특정 날짜와 이름의 공휴일 조회
    Optional<Holiday> findByHolidayDateAndHolidayName(LocalDate date, String holidayName);
    
    // 특정 날짜와 이름의 공휴일 존재 여부 확인
    boolean existsByHolidayDateAndHolidayName(LocalDate date, String holidayName);
    
    void deleteById(Long id);
}
