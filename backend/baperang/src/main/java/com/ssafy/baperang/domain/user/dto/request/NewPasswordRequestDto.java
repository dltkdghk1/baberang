package com.ssafy.baperang.domain.user.dto.request;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class NewPasswordRequestDto {
    private String loginId;
    private String nutritionistName;
    private String city;
    private String schoolName;
    private String newPassword;
}