package com.ssafy.baperang.domain.student.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@ToString
public class NfcStudentRequestDto {
    private Long studentPk;
    private String studentName;
    private Integer classNum;
    private Integer grade;
    private Integer number;
    private String gender;
    private String status;
    private Map<String, String> s3Url;
//    private String imageType;
}
