package com.ssafy.baperang.domain.leftover.repository;

import com.ssafy.baperang.domain.leftover.dto.response.LeftoverDateResponseDto;
import com.ssafy.baperang.domain.leftover.entity.Leftover;
import com.ssafy.baperang.domain.menu.entity.Menu;
import com.ssafy.baperang.domain.student.entity.Student;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface LeftoverRepository {

    // 저장 메서드
    Leftover save(Leftover leftover);

    // 특정 날짜 메뉴별 평균 잔반율 조회
    List<LeftoverDateResponseDto.MenuLeftoverRate> findAverageLeftoverRateByDate(LocalDate date);

    // 특정 연도와 월의 모든 잔반 데이터 조회
    List<Leftover> findByYearAndMonth(int year, int month);

    // 특정 학생의 특정 날짜 잔반 데이터 조회
    List<Leftover> findByStudentAndLeftoverDate(Student student, LocalDate leftoverDate);

    Optional<Leftover> findByStudentAndMenuAndLeftoverDate(Student student, Menu menu, LocalDate leftoverDate);

    List<Leftover> findByStudentAndLeftoverDateBetween(Student student, LocalDate startDate, LocalDate endDate);

    List<Leftover> findByStudentAndLeftoverDateIn(Student student, Collection<LocalDate> dates);

    // 학교와 날짜 기준 잔반율 입력 학생 수 카운트
    long countDistinctStudentByDateAndSchool(LocalDate date, com.ssafy.baperang.domain.school.entity.School school);

}