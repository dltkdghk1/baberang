package com.ssafy.baperang.domain.user.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class UpdateUserRequestDto {
    private String nutritionistName;
    private String password;
    private String schoolName;
    private String city;
}
