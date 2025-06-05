package com.ssafy.baperang.domain.inventory.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryResponseDto {
    private Long id;
    private LocalDate inventoryDate;
    private String productName;
    private String vendor;
    private Integer price;
    private Integer orderQuantity;
    private String orderUnit;
    private Integer useQuantity;
    private String useUnit;
}