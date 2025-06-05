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
public class MenuSuggestionResponseDto {
    private String message;
    private List<DailyMenu> menu;

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DailyMenu {
        private String date;
        private List<MenuItems> menuItems;
    }

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MenuItems {
        private Long menuId;
        private String menuName;
    }
}
