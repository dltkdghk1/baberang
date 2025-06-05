package com.ssafy.baperang.domain.leftover.service;

import java.util.Map;

public interface LeftoverService {
    Object getLeftoversByDate(String dateStr);

    Object getLeftoversByMonth(int year, int month);

    Object saveLeftovers(Long studentId, Map<String, Object> aiResponse);
}
