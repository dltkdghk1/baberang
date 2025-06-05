package com.ssafy.baperang.domain.user.dto.response;

import lombok.Builder;
import lombok.Getter;
	
@Getter
@Builder
public class ValidateTokenResponseDto {
    private String message;
    
    public ValidateTokenResponseDto(String message) {
        this.message = message;
    }
}
