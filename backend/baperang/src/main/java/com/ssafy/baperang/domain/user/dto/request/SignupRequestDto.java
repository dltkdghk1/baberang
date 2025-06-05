package com.ssafy.baperang.domain.user.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class SignupRequestDto {
    private String loginId;
    private String password;
    private String nutritionistName;
    private String city;
    private String schoolName;
}