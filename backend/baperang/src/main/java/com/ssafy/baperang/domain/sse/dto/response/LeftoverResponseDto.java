package com.ssafy.baperang.domain.sse.dto.response;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LeftoverResponseDto {
    
    private List<MenuLeftoverDto> menuLeftovers;
    
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MenuLeftoverDto {
        private String menuName;
        private String category;
        private Float leftoverRate;
    }
} 