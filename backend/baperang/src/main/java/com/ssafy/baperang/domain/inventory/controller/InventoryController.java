package com.ssafy.baperang.domain.inventory.controller;

import com.ssafy.baperang.domain.inventory.dto.request.InventoryRequestDto;
import com.ssafy.baperang.domain.inventory.dto.request.UpdateInventoryRequestDto;
import com.ssafy.baperang.domain.inventory.dto.response.ErrorResponseDto;
import com.ssafy.baperang.domain.inventory.service.InventoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/inventory")
@RequiredArgsConstructor
public class InventoryController {
    private final InventoryService inventoryService;

    @PostMapping("/create-inventory")
    public ResponseEntity<?> createInventory(
            @RequestHeader("Authorization") String authorizationHeader,
            @RequestBody InventoryRequestDto requestDto) {

        String token = authorizationHeader.substring(7);

        Object result = inventoryService.createInventory(token, requestDto);

        if (result instanceof ErrorResponseDto) {
            ErrorResponseDto error = (ErrorResponseDto) result;
            return ResponseEntity.status(error.getStatus()).body(error);
        }

        log.info("createInventory 정상 응답");
        return ResponseEntity.ok(result);
    }

    @GetMapping("/year={year}&month={month}")
    public ResponseEntity<?> getInventoriesByMonth(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable int year,
            @PathVariable int month) {

        String token = authorizationHeader.substring(7);

        Object result = inventoryService.findInventoriesByMonth(token, year, month);

        if (result instanceof ErrorResponseDto) {
            ErrorResponseDto error = (ErrorResponseDto) result;
            return ResponseEntity.status(error.getStatus()).body(error);
        }

        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/inventory-delete/{inventoryId}")
    public ResponseEntity<?> deleteInventory(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable Long inventoryId) {

        String token = authorizationHeader.substring(7);

        Object result = inventoryService.deleteInventory(token, inventoryId);

        if (result instanceof ErrorResponseDto) {
            ErrorResponseDto error = (ErrorResponseDto) result;
            return ResponseEntity.status(error.getStatus()).body(error);
        }
        return ResponseEntity.ok(result);
    }

    @PatchMapping("/inventory-update/{inventoryId}")
    public ResponseEntity<?> updateInventory(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable Long inventoryId,
            @RequestBody UpdateInventoryRequestDto requestDto) {

        String token = authorizationHeader.substring(7);

        Object result = inventoryService.updateInventory(token, inventoryId, requestDto);

        if (result instanceof ErrorResponseDto) {
            ErrorResponseDto error = (ErrorResponseDto) result;
            return ResponseEntity.status(error.getStatus()).body(error);
        }
        return ResponseEntity.ok(result);
    }
}
