package com.ssafy.baperang.domain.inventory.service;

import com.ssafy.baperang.domain.inventory.dto.request.InventoryRequestDto;
import com.ssafy.baperang.domain.inventory.dto.request.UpdateInventoryRequestDto;

public interface InventoryService {
    Object createInventory(String token, InventoryRequestDto requestDto);
    Object findInventoriesByMonth(String token, int year, int month);
    Object deleteInventory(String token, Long inventoryId);
    Object updateInventory(String token, Long inventoryId, UpdateInventoryRequestDto requestDto);
}
