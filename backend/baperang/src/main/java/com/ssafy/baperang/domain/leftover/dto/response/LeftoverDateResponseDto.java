package com.ssafy.baperang.domain.leftover.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LeftoverDateResponseDto {
    private List<MenuLeftoverRate> leftovers;

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MenuLeftoverRate {
        private String menuName;
        private Float leftoverRate;

        // JPQL new 연산자용 생성자
        public MenuLeftoverRate(String menuName, Double leftoverRate) {
            this.menuName = menuName;
            this.leftoverRate = leftoverRate != null
                    ? leftoverRate.floatValue()
                    : 0.0f;
        }
    }
}
