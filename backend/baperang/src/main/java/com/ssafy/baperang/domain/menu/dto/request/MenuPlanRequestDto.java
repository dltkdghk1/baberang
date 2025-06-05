package com.ssafy.baperang.domain.menu.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.Map;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MenuPlanRequestDto {
    private Map<String, Map<String, MenuDetailDto>> menuData;
    private Map<String, String> menuPool;

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MenuDetailDto {
        private double leftover;
        private double preference;
        private Map<String, Double> nutrition;
    }
}
