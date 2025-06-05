package com.ssafy.baperang.domain.user.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ValidateIdRequestDto {
    private String loginId;
}