package com.ssafy.baperang.domain.user.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SignupResponseDto {
    private String message;
    private SignupContent content;

    @Getter
    @Builder
    public static class SignupContent {
        private String loginId;
        private String nutritionistName;
        private String city;
        private String schoolName;
    }
}