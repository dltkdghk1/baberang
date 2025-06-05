package com.ssafy.baperang.domain.inventory.service;

import com.ssafy.baperang.domain.inventory.dto.request.InventoryRequestDto;
import com.ssafy.baperang.domain.inventory.dto.request.UpdateInventoryRequestDto;
import com.ssafy.baperang.domain.inventory.dto.response.DeleteInventoryResponseDto;
import com.ssafy.baperang.domain.inventory.dto.response.InventoryResponseDto;
import com.ssafy.baperang.domain.inventory.dto.response.MonthInventoryResponseDto;
import com.ssafy.baperang.domain.inventory.entity.Inventory;
import com.ssafy.baperang.domain.inventory.repository.InventoryRepository;
import com.ssafy.baperang.domain.leftover.dto.response.ErrorResponseDto;
import com.ssafy.baperang.global.exception.BaperangErrorCode;
import com.ssafy.baperang.global.jwt.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class InventoryServiceImpl implements InventoryService {

    private final InventoryRepository inventoryRepository;
    private final JwtService jwtService;

    @Override
    @Transactional
    public Object createInventory(String token, InventoryRequestDto requestDto) {
        log.info("재고 정보 생성 시작");

        try {
            // 토큰 유효성 검사
            if (!jwtService.validateToken(token)) {
                log.error("유효하지 않은 토큰");
                return ErrorResponseDto.of(BaperangErrorCode.INVALID_TOKEN);
            }

            Long userPk = jwtService.getUserId(token);
            if (userPk == null) {
                log.error("토큰에서 사용자 ID를 가져올 수 없음");
                return ErrorResponseDto.of(BaperangErrorCode.INVALID_TOKEN);
            }

            // 사용 수량이 주문 수량보다 많은지 검사
            if (requestDto.getUseQuantity() > requestDto.getOrderQuantity()) {
                log.error("사용 수량이 주문 수량보다 많습니다: 주문={}, 사용={}",
                        requestDto.getOrderQuantity(), requestDto.getUseQuantity());
                return ErrorResponseDto.of(BaperangErrorCode.INVALID_INPUT_VALUE);
            }

            if (requestDto.getOrderUnit() == null || requestDto.getUseUnit() == null) {
                log.error("주문 단위 또는 사용 단위가 제공되지 않았습니다");
                return ErrorResponseDto.of(BaperangErrorCode.INVALID_INPUT_VALUE);
            }

            // 엔티티 생성 및 저장
            Inventory inventory = Inventory.builder()
                    .inventoryDate(requestDto.getInventoryDate())
                    .productName(requestDto.getProductName())
                    .vendor(requestDto.getVendor())
                    .price(requestDto.getPrice())
                    .orderQuantity(requestDto.getOrderQuantity())
                    .orderUnit(requestDto.getOrderUnit())
                    .useQuantity(requestDto.getUseQuantity())
                    .useUnit(requestDto.getUseUnit())
                    .build();

            Inventory savedInventory = inventoryRepository.saveAndFlush(inventory);
            log.info("재고 정보 저장 완료, ID: {}", savedInventory.getId());

            // 응답 DTO 생성
            InventoryResponseDto responseDto = createResponseDto(savedInventory);
            return responseDto;

        } catch (Exception e) {
            log.error("재고 정보 생성 중 오류 발생: {}", e.getMessage(), e);
            return ErrorResponseDto.of(BaperangErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Object findInventoriesByMonth(String token, int year, int month) {
        log.info("{}년 {}월 재고 정보 조회 시작", year, month);

        try {
            // 토큰 유효성 검사
            if (!jwtService.validateToken(token)) {
                log.error("유효하지 않은 토큰");
                return ErrorResponseDto.of(BaperangErrorCode.INVALID_TOKEN);
            }

            Long userPk = jwtService.getUserId(token);
            if (userPk == null) {
                log.error("토큰에서 사용자 ID를 가져올 수 없음");
                return ErrorResponseDto.of(BaperangErrorCode.INVALID_TOKEN);
            }

            // 월별 재고 정보 조회
            List<Inventory> inventories = inventoryRepository.findByYearAndMonth(year, month);
            log.info("{}년 {}월 재고 정보 {}건 조회 완료", year, month, inventories.size());

            // 응답 DTO 리스트 생성
            List<InventoryResponseDto> inventoryDtos = inventories.stream()
                    .map(this::createResponseDto)
                    .collect(Collectors.toList());

            // 월별 응답 dto
            MonthInventoryResponseDto responseDto = MonthInventoryResponseDto.builder()
                    .year(year)
                    .month(month)
                    .totalCount(inventoryDtos.size())
                    .inventories(inventoryDtos)
                    .build();

            return responseDto;

        } catch (Exception e) {
            log.error("{}년 {}월 재고 정보 조회 중 오류 발생: {}", year, month, e.getMessage(), e);
            return ErrorResponseDto.of(BaperangErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    // 응답 DTO 생성 헬퍼 메서드
    private InventoryResponseDto createResponseDto(Inventory inventory) {
        return InventoryResponseDto.builder()
                .id(inventory.getId())
                .inventoryDate(inventory.getInventoryDate())
                .productName(inventory.getProductName())
                .vendor(inventory.getVendor())
                .price(inventory.getPrice())
                .orderQuantity(inventory.getOrderQuantity())
                .orderUnit(inventory.getOrderUnit())
                .useQuantity(inventory.getUseQuantity())
                .useUnit(inventory.getUseUnit())
                .build();
    }

    @Override
    @Transactional
    public Object deleteInventory(String token, Long inventoryId) {
        log.info("재고 정보 삭제 시작, ID: {}", inventoryId);

        try {
            if (!jwtService.validateToken(token)) {
                log.error("유효하지 않는 토큰");
                return ErrorResponseDto.of(BaperangErrorCode.INVALID_TOKEN);
            }

            Long userPk = jwtService.getUserId(token);
            if (userPk == null) {
                log.error("토큰에서 사용자 ID를 가져올 수 없음");
                return ErrorResponseDto.of(BaperangErrorCode.INVALID_TOKEN);
            }

            // 삭제할 재고 정보 조회
            Optional<Inventory> inventoryOpt = inventoryRepository.findById(inventoryId);
            if (!inventoryOpt.isPresent()) {
                log.error("삭제할 재고 정보를 찾을 수 없음", inventoryId);
                return ErrorResponseDto.of(BaperangErrorCode.RESOURCE_NOT_FOUND);
            }

            inventoryRepository.deleteById(inventoryId);
            log.info("재고 정보 삭제 완료, ID: {}", inventoryId);

            return DeleteInventoryResponseDto.of(inventoryId);

        } catch (Exception e) {
            log.error("재고 정보 삭제 중 오류 발생", e.getMessage(), e);
            return ErrorResponseDto.of(BaperangErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    @Override
    @Transactional
    public Object updateInventory(String token, Long inventoryId, UpdateInventoryRequestDto requestDto) {
        log.info("재고 정보 수정 시작, ID: {}", inventoryId);

        try {
            if (!jwtService.validateToken(token)) {
                log.error("유효하지 않는 토큰");
                return ErrorResponseDto.of(BaperangErrorCode.INVALID_TOKEN);
            }

            Long userPk = jwtService.getUserId(token);
            if (userPk == null) {
                log.error("토큰에서 사용자 ID를 가져올 수 없음");
                return ErrorResponseDto.of(BaperangErrorCode.INVALID_TOKEN);
            }

            if (!requestDto.NotNullField()) {
                log.error("수정할 필드 없음");
                return ErrorResponseDto.of(BaperangErrorCode.INVALID_INPUT_VALUE);
            }

            Optional<Inventory> inventoryOpt = inventoryRepository.findById(inventoryId);
            if (!inventoryOpt.isPresent()) {
                log.error("수정할 재고 정보를 찾을 수 없음, ID: {}", inventoryId);
                return ErrorResponseDto.of(BaperangErrorCode.RESOURCE_NOT_FOUND);
            }

            Inventory inventory = inventoryOpt.get();

            if (requestDto.getInventoryDate() != null) {
                inventory.updateInventoryDate(requestDto.getInventoryDate());
            }

            if (requestDto.getProductName() != null) {
                inventory.updateProductName(requestDto.getProductName());
            }

            if (requestDto.getVendor() != null) {
                inventory.updateVendor(requestDto.getVendor());
            }

            if (requestDto.getPrice() != null) {
                inventory.updatePrice(requestDto.getPrice());
            }

            if (requestDto.getOrderQuantity() != null) {
                inventory.updateOrderQuantity(requestDto.getOrderQuantity());
            }

            if (requestDto.getOrderUnit() != null) {
                inventory.updateOrderUnit(requestDto.getOrderUnit());
            }

            if (requestDto.getUseQuantity() != null) {
                Integer newUseQuantity = requestDto.getUseQuantity();
                Integer newOrderQuantity = inventory.getOrderQuantity();

                if (requestDto.getOrderQuantity() != null) {
                    newOrderQuantity = requestDto.getOrderQuantity();
                }

                if (newUseQuantity > newOrderQuantity &&
                        inventory.getOrderUnit().equals(inventory.getUseUnit())) {
                    log.error("사용 수량이 새 주문 수량보다 많습니다: 주문={}, 사용={}",
                            newOrderQuantity, newUseQuantity);
                    return ErrorResponseDto.of(BaperangErrorCode.INVALID_INPUT_VALUE);
                }

                inventory.updateUseQuantity(newUseQuantity);
            }

            if (requestDto.getUseUnit() != null) {
                inventory.updateUseUnit(requestDto.getUseUnit());
            }

            log.info("재고 정보 수정 완료: ID: {}", inventoryId);

            InventoryResponseDto responseDto = createResponseDto(inventory);
            return responseDto;
        } catch (Exception e) {
            log.error("재고 정보 수정 중 오류 발생: {}", e.getMessage(), e);
            return ErrorResponseDto.of(BaperangErrorCode.INTERNAL_SERVER_ERROR);
        }
    }
}