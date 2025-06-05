package com.ssafy.baperang.domain.student.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.Map;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GetStudentLeftoverResponseDto {
    private String leftoverDate;
    private String studentName;
    private Map<String, Float> leftover;
}
