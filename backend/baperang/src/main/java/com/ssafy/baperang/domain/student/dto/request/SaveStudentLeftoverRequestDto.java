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
public class SaveStudentLeftoverRequestDto {
    private Long schoolPk;
    private Long studentPk;
    private String leftoverDate;
    private Map<String, Float> leftover;
}
