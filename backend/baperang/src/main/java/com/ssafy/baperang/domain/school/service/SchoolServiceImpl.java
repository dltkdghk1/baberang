package com.ssafy.baperang.domain.school.service;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.ssafy.baperang.domain.school.dto.response.CitiesResponseDto;
import com.ssafy.baperang.domain.school.dto.response.SchoolsResponseDto;
import com.ssafy.baperang.domain.school.entity.School;
import com.ssafy.baperang.domain.school.repository.SchoolRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SchoolServiceImpl implements SchoolService {

    private final SchoolRepository schoolRepository;
    
    @Override
    public CitiesResponseDto getCities() {
        List<String> cities = schoolRepository.findCities();
        return new CitiesResponseDto(cities);
    }

    @Override
    public SchoolsResponseDto getSchools(String city, String schoolName) {
        List<School> schools;
        
        if (city != null && !city.isEmpty()) {
            schools = schoolRepository.findByCityAndSchoolNameStartingWith(
                city, schoolName);
        } else {
            schools = Collections.emptyList();
        }
        
        return new SchoolsResponseDto(schools.stream().map(School::getSchoolName).collect(Collectors.toList()));
    }
}
