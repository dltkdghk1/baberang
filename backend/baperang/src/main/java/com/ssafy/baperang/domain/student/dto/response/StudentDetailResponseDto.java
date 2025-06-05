package com.ssafy.baperang.domain.student.dto.response;

import com.ssafy.baperang.domain.student.entity.Student;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.Map;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentDetailResponseDto {
    private Long studentId;
    private String studentName;
    private Integer grade;
    private Integer classNum;
    private Integer number;
    private Float height;
    private Float weight;
    private LocalDate date;
    private String content;
    private String schoolName;
    private Float bmi;
    private Float weeklyLeftoverAverage;

    // Entity에서 DTO로 변환하는 정적 메소드
    public static StudentDetailResponseDto fromEntity(Student student) {
        return StudentDetailResponseDto.builder()
                .studentId(student.getId())
                .studentName(student.getStudentName())
                .grade(student.getGrade())
                .classNum(student.getClassNum())
                .number(student.getNumber())
                .height(student.getHeight())
                .weight(student.getWeight())
                .date(student.getImageDate())
                .content(student.getContent())
                .schoolName(student.getSchool().getSchoolName())
                .bmi(null)
                .build();
    }
}