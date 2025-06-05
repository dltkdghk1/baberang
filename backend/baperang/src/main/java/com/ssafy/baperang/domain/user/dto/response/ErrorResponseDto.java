package com.ssafy.baperang.domain.user.dto.response;

import com.ssafy.baperang.global.exception.BaperangErrorCode;

import lombok.Builder;
import lombok.Getter;

/**
 * User 도메인에서 사용하는 에러 응답 DTO
 */
@Getter
@Builder
public class ErrorResponseDto {
    private final int status;
    private final String code;
    private final String message;

    /**
     * BaperangErrorCode로부터 ErrorResponseDto 생성
     */
    public static ErrorResponseDto of(BaperangErrorCode errorCode) {
        return ErrorResponseDto.builder()
                .status(errorCode.getStatus())
                .code(errorCode.getCode())
                .message(errorCode.getMessage())
                .build();
    }

    /**
     * 상태 코드, 에러 코드, 메시지를 직접 지정하여 ErrorResponseDto 생성
     */
    public static ErrorResponseDto of(int status, String code, String message) {
        return ErrorResponseDto.builder()
                .status(status)
                .code(code)
                .message(message)
                .build();
    }
}