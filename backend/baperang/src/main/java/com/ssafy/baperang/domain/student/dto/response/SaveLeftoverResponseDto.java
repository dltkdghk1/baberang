package com.ssafy.baperang.domain.student.dto.response;

import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SaveLeftoverResponseDto {
    private Long studentId;
    private String studentName;
    private LocalDate leftoverDate;
    private Integer count;
    private String message;
}