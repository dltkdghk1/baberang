package com.ssafy.baperang.global.performance.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ssafy.baperang.global.performance.model.ControllerPerformance;
import com.ssafy.baperang.global.performance.repository.ControllerPerformanceRepository;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/performance")
@RequiredArgsConstructor
public class PerformanceController {

    private final ControllerPerformanceRepository repository;

    @GetMapping
    public Page<ControllerPerformance> getPerformanceData(Pageable pageable) {
        return repository.findAll(pageable);
    }
} 