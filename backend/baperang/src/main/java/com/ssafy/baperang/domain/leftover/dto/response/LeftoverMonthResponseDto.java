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
public class LeftoverMonthResponseDto {
    private String period;
    private List<DailyLeftoverRate> data;
    private Float monthlyAverage;

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DailyLeftoverRate {
        private String date;
        private Float leftoverRate;

        public DailyLeftoverRate(String date, Double leftoverRate) {
            this.date = date;
            this.leftoverRate = leftoverRate != null
                    ? leftoverRate.floatValue()
                    : 0.0f;
        }
    }
}
