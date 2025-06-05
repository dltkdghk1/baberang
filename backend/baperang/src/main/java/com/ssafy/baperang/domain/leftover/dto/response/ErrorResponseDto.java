package com.ssafy.baperang.domain.leftover.dto.response;

import com.ssafy.baperang.global.exception.BaperangErrorCode;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ErrorResponseDto {
    private int status;
    private String code;
    private String message;

    public static ErrorResponseDto of(BaperangErrorCode errorCode) {
        return ErrorResponseDto.builder()
                .status(errorCode.getStatus())
                .code(errorCode.getCode())
                .message(errorCode.getMessage())
                .build();
    }
}