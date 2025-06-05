package com.ssafy.baperang.domain.student.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentNamesResponseDto {
    private List<StudentInfo> students;

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class StudentInfo {
        private Long studentId;
        private String studentName;
        private String gender;
        private int grade;
        private int classNum;
        private int number;
    }
}