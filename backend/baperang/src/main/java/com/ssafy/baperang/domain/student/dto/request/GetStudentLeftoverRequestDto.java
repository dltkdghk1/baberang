package com.ssafy.baperang.domain.student.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GetStudentLeftoverRequestDto {
    private String leftoverDate;
    private int grade;
    private int classNum;
    private int number;
}