package com.ssafy.baperang.domain.inventory.dto.response;

import com.ssafy.baperang.domain.inventory.dto.request.InventoryRequestDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MonthInventoryResponseDto {
    private int year;
    private int month;
    private int totalCount;
    private List<InventoryResponseDto> inventories;
}
