package com.ssafy.baperang.domain.leftover.repository;

import com.ssafy.baperang.domain.leftover.dto.response.LeftoverDateResponseDto;
import com.ssafy.baperang.domain.leftover.entity.Leftover;
import com.ssafy.baperang.domain.menu.entity.Menu;
import com.ssafy.baperang.domain.student.entity.Student;
import com.ssafy.baperang.domain.school.entity.School;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface LeftoverJpaRepository extends JpaRepository<Leftover, Long> {

    // 특정 날짜 메뉴별 평균 잔반율 조회 (JPQL 사용)
    @Query("SELECT new com.ssafy.baperang.domain.leftover.dto.response.LeftoverDateResponseDto$MenuLeftoverRate(l.leftMenuName, AVG(l.leftoverRate)) " +
            "FROM Leftover l " +
            "WHERE l.leftoverDate = :date " +
            "GROUP BY l.leftMenuName")

    List<LeftoverDateResponseDto.MenuLeftoverRate> findAverageLeftoverRateByDate(@Param("date") LocalDate date);

    // 특정 연도와 월의 모든 잔반 데이터 조회
    @Query("SELECT l FROM Leftover l WHERE YEAR(l.leftoverDate) = :year AND MONTH(l.leftoverDate) = :month ORDER BY l.leftoverDate")
    List<Leftover> findByYearAndMonth(@Param("year") int year, @Param("month") int month);

    List<Leftover> findByStudentAndLeftoverDate(Student student, LocalDate leftoverDate);

    Optional<Leftover> findByStudentAndMenuAndLeftoverDate(Student student, Menu menu, LocalDate localDate);

    List<Leftover> findByStudentAndLeftoverDateBetween(Student student, LocalDate startDate, LocalDate endDate);

    List<Leftover> findByStudentAndLeftoverDateIn(Student student, Collection<LocalDate> dates);

    // 학교와 날짜 기준 잔반율 입력 학생 수 카운트
    @Query("SELECT COUNT(DISTINCT l.student.id) FROM Leftover l WHERE l.leftoverDate = :date AND l.student.school = :school")
    long countDistinctStudentByDateAndSchool(@Param("date") LocalDate date, @Param("school") School school);
}
