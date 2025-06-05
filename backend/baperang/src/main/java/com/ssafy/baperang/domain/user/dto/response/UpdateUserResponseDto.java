package com.ssafy.baperang.domain.user.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class UpdateUserResponseDto {
    private String message;
    private UpdateUserContent content;

    @Getter
    @Builder
    public static class UpdateUserContent {
        private String loginId;
        private String nutritionistName;
        private String schoolName;
        private String city;
    }
}