package com.ssafy.baperang.domain.menu.dto.response;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MenuPlanResponseDto {
    private List<DayMenu> dayMenus;

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DayMenu {
        private String date;
        private List<String> menus;
    }
}
