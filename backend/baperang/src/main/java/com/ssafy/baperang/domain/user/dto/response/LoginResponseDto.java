package com.ssafy.baperang.domain.user.dto.response;

import lombok.Getter;

@Getter
public class LoginResponseDto {
    // JWT 토큰에 모든 필수 정보가 있으므로 별도 응답 필드 불필요
    // Builder 패턴이 작동하려면 최소한 하나의 필드가 필요하므로 더미 필드 추가
    private final boolean success = true;
}
