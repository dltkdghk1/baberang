package com.ssafy.baperang.domain.menu.repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

import org.springframework.stereotype.Repository;

import com.ssafy.baperang.domain.menu.entity.Menu;
import com.ssafy.baperang.domain.school.entity.School;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class MenuRepositoryImpl implements MenuRepository {

    private final MenuJpaRepository menuJpaRepository;
    
    @Override
    public Menu saveAndFlush(Menu menu) {
        return menuJpaRepository.saveAndFlush(menu);
    }

    @Override
    public List<Menu> saveAll(List<Menu> menus) {
        return menuJpaRepository.saveAll(menus);
    }

    @Override
    public List<Menu> findByMenuDate(LocalDate menuDate) {
        return menuJpaRepository.findByMenuDate(menuDate);
    }

    @Override
    public List<Menu> findBySchool(School school) {
        return menuJpaRepository.findBySchool(school);
    }

    @Override
    public List<Menu> findBySchoolAndMenuDateBetweenOrderByMenuDate(School school, LocalDate startDate, LocalDate endDate) {
        return menuJpaRepository.findBySchoolAndMenuDateBetweenOrderByMenuDate(school, startDate, endDate);
    }

    @Override
    public boolean existsBySchoolAndMenuDateAndMenuName(School school, LocalDate menuDate, String menuName) {
        return menuJpaRepository.existsBySchoolAndMenuDateAndMenuName(school, menuDate, menuName);
    }
    
    @Override
    public List<String> findDistinctMenuNamesBySchoolAndMenuDate(School school, LocalDate menuDate) {
        return menuJpaRepository.findDistinctMenuNamesBySchoolAndMenuDate(school, menuDate);
    }
    
    @Override
    public Menu findBySchoolAndMenuDateAndMenuName(School school, LocalDate menuDate, String menuName) {
        return menuJpaRepository.findBySchoolAndMenuDateAndMenuName(school, menuDate, menuName);
    }
    
    @Override
    public List<Menu> findBySchoolAndMenuDate(School school, LocalDate menuDate) {
        return menuJpaRepository.findBySchoolAndMenuDate(school, menuDate);
    }

    @Override
    public List<Menu> findAllByIdIn(Collection<Long> menuIds) {
        return menuJpaRepository.findAllByIdIn(menuIds);
    }
    
    @Override
    public List<Menu> findBySchoolAndMenuName(School school, String menuName) {
        return menuJpaRepository.findBySchoolAndMenuName(school, menuName);
    }
}
