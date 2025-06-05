package com.ssafy.baperang.domain.sse.dto.request;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class SatisfactionRequestDto {
    private String schoolName;
    private String menuname;
    private int satisfactionScore;

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MenuSatisfactionDto {
        private Long menuId;
        private String menuname;
        private double averageSatisfaction;
    }
}