package com.ssafy.baperang.global.performance.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.ssafy.baperang.global.performance.model.ControllerPerformance;

@Repository
public interface ControllerPerformanceRepository extends JpaRepository<ControllerPerformance, Long> {
} 