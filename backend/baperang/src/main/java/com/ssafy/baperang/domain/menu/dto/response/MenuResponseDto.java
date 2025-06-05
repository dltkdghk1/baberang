package com.ssafy.baperang.domain.menu.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MenuResponseDto {
    private List<Days> days;

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Days {
        private String date;
        private String dayOfWeekName;
        private List<Menus> menu;
        private List<String> holiday;
    }

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Menus {
        private Long menuId;
        private String menuName;
    }
}
