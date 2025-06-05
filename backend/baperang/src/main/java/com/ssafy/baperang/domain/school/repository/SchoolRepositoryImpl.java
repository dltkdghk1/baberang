package com.ssafy.baperang.domain.school.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Repository;

import com.ssafy.baperang.domain.school.entity.School;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class SchoolRepositoryImpl implements SchoolRepository {

    private final SchoolJpaRepository schoolJpaRepository;

    @Override
    public List<School> findAll() {
        return schoolJpaRepository.findAll();
    }

    @Override
    public Optional<School> findById(Long schoolId) {
        return schoolJpaRepository.findById(schoolId);
    }

    @Override
    public Optional<School> findBySchoolName(String schoolName) {
        return schoolJpaRepository.findBySchoolName(schoolName);
    }

    @Override
    public School saveAndFlush(School school) {
        return schoolJpaRepository.saveAndFlush(school);
    }

    @Override
    public Optional<School> findBySchoolNameAndCity(String schoolName, String city) {
        return schoolJpaRepository.findBySchoolNameAndCity(schoolName, city);
    }
    
    @Override
    public boolean existsBySchoolNameAndCity(String schoolName, String city) {
        return schoolJpaRepository.existsBySchoolNameAndCity(schoolName, city);
    }

    @Override
    public List<String> findCities() {
        return schoolJpaRepository.findCities();
    }

    @Override
    public List<School> findByCityAndSchoolNameStartingWith(String city, String schoolName) {
        return schoolJpaRepository.findByCityAndSchoolNameStartingWith(city, schoolName);
    }
    
}