package com.ssafy.baperang.domain.user.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LogoutResponseDto {
    private final String message;
}
