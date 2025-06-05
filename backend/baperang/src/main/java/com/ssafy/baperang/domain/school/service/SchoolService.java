package com.ssafy.baperang.domain.school.service;

import com.ssafy.baperang.domain.school.dto.response.SchoolsResponseDto;
import com.ssafy.baperang.domain.school.dto.response.CitiesResponseDto;

public interface SchoolService {
    CitiesResponseDto getCities();
    SchoolsResponseDto getSchools(String city, String schoolName);
}
