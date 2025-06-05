package com.ssafy.baperang.domain.inventory.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeleteInventoryResponseDto {
    private String message;

    public static DeleteInventoryResponseDto of(Long Id) {
        return DeleteInventoryResponseDto.builder()
                .message("재고 정보가 삭제되었습니다.")
                .build();
    }
}
