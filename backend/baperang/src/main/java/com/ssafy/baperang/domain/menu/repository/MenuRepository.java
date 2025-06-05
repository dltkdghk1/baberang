package com.ssafy.baperang.domain.menu.repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.ssafy.baperang.domain.menu.entity.Menu;
import com.ssafy.baperang.domain.school.entity.School;

@Repository
public interface MenuRepository {

    Menu saveAndFlush(Menu menu);
    
    List<Menu> saveAll(List<Menu> menus);
    
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

    List<Menu> findAllByIdIn(Collection<Long> menuIds);
    
    // 특정 학교의 특정 메뉴 이름 조회 (모든 날짜)
    List<Menu> findBySchoolAndMenuName(
            School school,
            String menuName
    );
}
