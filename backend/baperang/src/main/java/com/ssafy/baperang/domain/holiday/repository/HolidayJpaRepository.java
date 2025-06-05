package com.ssafy.baperang.domain.holiday.repository;

import com.ssafy.baperang.domain.holiday.entity.Holiday;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface HolidayJpaRepository extends JpaRepository<Holiday, Long> {
    // 특정 날짜의 모든 공휴일 찾기
    List<Holiday> findByHolidayDate(LocalDate date);
    
    // 특정 기간의 모든 공휴일 찾기
    List<Holiday> findByHolidayDateBetween(LocalDate startDate, LocalDate endDate);
    
    // 특정 날짜와 이름으로 공휴일 찾기
    Optional<Holiday> findByHolidayDateAndHolidayName(LocalDate date, String holidayName);
    
    // 특정 날짜와 이름으로 공휴일 존재 여부 확인
    boolean existsByHolidayDateAndHolidayName(LocalDate date, String holidayName);
}
