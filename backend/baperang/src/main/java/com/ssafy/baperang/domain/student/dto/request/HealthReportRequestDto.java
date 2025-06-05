package com.ssafy.baperang.domain.student.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.Map;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HealthReportRequestDto {
    private Float bmi;
    private Map<String, Float> leftover;
    private Map<String, String> leftoverMost;
    private Map<String, String> leftoverLeast;
    private Map<String, Map<String, Integer>> nutrient;
}
