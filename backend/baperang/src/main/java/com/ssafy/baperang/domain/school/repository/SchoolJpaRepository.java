package com.ssafy.baperang.domain.school.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.ssafy.baperang.domain.school.entity.School;

import java.util.List;
import java.util.Optional;

public interface SchoolJpaRepository extends JpaRepository<School, Long> {
    List<School> findAll();
    School saveAndFlush(School school);
    Optional<School> findById(Long schoolId);
    Optional<School> findBySchoolName(String schoolName);
    Optional<School> findBySchoolNameAndCity(String schoolName, String city);
    boolean existsBySchoolNameAndCity(String schoolName, String city);
    
    @Query("SELECT DISTINCT s.city FROM School s ORDER BY s.city")
    List<String> findCities();
    
    List<School> findByCityAndSchoolNameStartingWith(String city, String schoolName);
}
