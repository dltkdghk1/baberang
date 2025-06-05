package com.ssafy.baperang.domain.user.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class UserDetailResponseDto {
    private String loginId;
    private String nutritionistName;
    private String schoolName;
    private String city;
}