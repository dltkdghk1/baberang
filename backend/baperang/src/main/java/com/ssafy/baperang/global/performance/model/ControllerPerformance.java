package com.ssafy.baperang.global.performance.model;

import java.time.LocalDateTime;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ControllerPerformance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String controllerName;
    private String methodName;
    private Long executionTimeMs;
    private LocalDateTime timestamp;
    private String requestPath;
    private String httpMethod;
    
    // 응답 성공/실패 여부
    private Boolean isSuccess;
    // HTTP 상태 코드
    private Integer statusCode;
    // 실패한 경우 예외 메시지
    private String errorMessage;
} 