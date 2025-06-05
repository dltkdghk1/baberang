package com.ssafy.baperang.domain.menu.dto.request;

import lombok.Getter;

@Getter
public class UpdateMenuRequestDto {
    private String menu;
    private String date;
    private String alternative_menu;
}
