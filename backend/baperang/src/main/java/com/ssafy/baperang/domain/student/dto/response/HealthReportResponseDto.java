package com.ssafy.baperang.domain.student.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HealthReportResponseDto {
    private String analyzeReport;
    private String plan;
    private String opinion;
}
