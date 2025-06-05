package com.ssafy.baperang.domain.student.service;

public interface HealthReportService {
    Object generateReport(String token, Long studentId);
    Object saveReport(Long studentId, String reportContent);
}
