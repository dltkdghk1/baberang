package com.ssafy.baperang.domain.menu.service;

import com.ssafy.baperang.domain.menu.dto.request.MenuRequestDto;

public interface MenuService {
    Object getMenuCalendar(MenuRequestDto requestDto, String token);

    Object getOneDayMenu(String token, String date);  

    Object getTodayMenu(String token);

    Object getMenuNutrient(String token, String menu, String date);

    Object makeMonthMenu(String token);

    Object getAlternatives(String token, String menu, String date);

    Object updateMenu(String token, String menu, String date, String alternative_menu);
}