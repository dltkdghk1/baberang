package com.ssafy.baperang.domain.sse.dto.response;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SatisfactionResponseDto {
    private List<MenuSatisfactionDto> allMenuSatisfactions;
    
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MenuSatisfactionDto {
        private String menuName;
        private Integer voteCount;
        private String averageSatisfaction;
    }
} 