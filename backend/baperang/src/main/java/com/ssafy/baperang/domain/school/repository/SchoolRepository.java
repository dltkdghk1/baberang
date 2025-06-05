package com.ssafy.baperang.domain.school.repository;

import com.ssafy.baperang.domain.school.entity.School;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SchoolRepository {
    List<School> findAll();
    Optional<School> findById(Long schoolId);
    School saveAndFlush(School school);
    Optional<School> findBySchoolName(String schoolName);
    Optional<School> findBySchoolNameAndCity(String schoolName, String city);
    boolean existsBySchoolNameAndCity(String schoolName, String city);
    List<String> findCities();
    List<School> findByCityAndSchoolNameStartingWith(String city, String schoolName);
}
