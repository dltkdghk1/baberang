package com.ssafy.baperang.domain.leftover.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LeftoverDateRequestDto {
    private String leftoverDate;
}
