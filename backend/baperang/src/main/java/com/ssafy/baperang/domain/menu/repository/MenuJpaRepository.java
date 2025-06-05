package com.ssafy.baperang.domain.menu.repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.ssafy.baperang.domain.menu.entity.Menu;
import com.ssafy.baperang.domain.school.entity.School;

public interface MenuJpaRepository extends JpaRepository<Menu, Long> {

    Menu saveAndFlush(Menu menu);
    // 날짜로 잔반율 조회
    List<Menu> findByMenuDate(LocalDate menuDate);

    // 학교별 메뉴 조회
    List<Menu> findBySchool(School school);

    List<Menu> findBySchoolAndMenuDateBetweenOrderByMenuDate(
            School school,
            LocalDate startDate,
            LocalDate endDate
    );

    // 특정 날짜의 메뉴 이름 목록 조회 (잔반율 서비스에서 활용 가능)
    @Query("SELECT DISTINCT m.menuName FROM Menu m WHERE m.school = :school AND m.menuDate = :date")
    List<String> findDistinctMenuNamesBySchoolAndMenuDate(
            @Param("school") School school,
            @Param("date") LocalDate date
    );

    boolean existsBySchoolAndMenuDateAndMenuName(
            School school,
            LocalDate menuDate,
            String menuName
    );

    // 특정 학교, 날짜, 메뉴명으로 메뉴 조회
    Menu findBySchoolAndMenuDateAndMenuName(
            School school,
            LocalDate menuDate,
            String menuName
    );

    // 특정 학교, 날짜의 모든 메뉴 조회
    List<Menu> findBySchoolAndMenuDate(
            School school,
            LocalDate menuDate
    );

    // 여러 ID로 메뉴 한번에 조회
    List<Menu> findAllByIdIn(Collection<Long> menuIds);
    
    // 학교와 메뉴 이름으로 조회 (날짜 상관없이)
    List<Menu> findBySchoolAndMenuName(
            School school,
            String menuName
    );
}

