package com.ssafy.baperang.domain.menu.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MenuRequestDto {
    private Integer year;
    private Integer month;
}
