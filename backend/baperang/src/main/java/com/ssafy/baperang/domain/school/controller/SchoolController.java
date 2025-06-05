package com.ssafy.baperang.domain.school.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ssafy.baperang.domain.school.dto.response.CitiesResponseDto;
import com.ssafy.baperang.domain.school.dto.response.SchoolsResponseDto;
import com.ssafy.baperang.domain.school.service.SchoolService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/school")
@RequiredArgsConstructor
public class SchoolController {

    private final SchoolService schoolService;

    @GetMapping("/cities")
    public CitiesResponseDto getCities() {
        return schoolService.getCities();
    }

    @GetMapping("/schools")
    public SchoolsResponseDto getSchools(
            @RequestParam(required = true) String city,
            @RequestParam(required = false) String schoolName) {
        return schoolService.getSchools(city, schoolName);
    }
}
