package com.ssafy.baperang.global.performance.aspect;

import java.lang.reflect.Method;
import java.time.LocalDateTime;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import com.ssafy.baperang.global.performance.model.ControllerPerformance;
import com.ssafy.baperang.global.performance.repository.ControllerPerformanceRepository;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Aspect
@Component
@Slf4j
@RequiredArgsConstructor
public class ControllerPerformanceAspect {

    private final ControllerPerformanceRepository repository;

    @Around("execution(* com.ssafy.baperang.domain.*.controller.*.*(..))")
    public Object measureExecutionTime(ProceedingJoinPoint joinPoint) throws Throwable {
        long startTime = System.currentTimeMillis();
        
        Object result = null;
        Boolean isSuccess = true;
        Integer statusCode = 200;
        String errorMessage = null;
        
        try {
            // 메서드 실행
            result = joinPoint.proceed();
            
            // 응답이 ResponseEntity인 경우 상태 코드 추출
            if (result instanceof ResponseEntity) {
                ResponseEntity<?> responseEntity = (ResponseEntity<?>) result;
                statusCode = responseEntity.getStatusCode().value();
                // 4xx, 5xx는 실패로 간주
                isSuccess = statusCode < 400;
            }
            
            return result;
        } catch (Exception e) {
            // 예외 발생 시 실패로 처리
            isSuccess = false;
            statusCode = 500; // 기본값으로 500 설정
            errorMessage = e.getMessage();
            
            // 예외를 다시 던져서 원래 예외 처리 로직이 동작하도록 함
            throw e;
        } finally {
            long executionTime = System.currentTimeMillis() - startTime;
            
            // Get method details
            MethodSignature signature = (MethodSignature) joinPoint.getSignature();
            Method method = signature.getMethod();
            String methodName = method.getName();
            String controllerName = joinPoint.getTarget().getClass().getSimpleName();
            
            // Get HTTP request details
            HttpServletRequest request = ((ServletRequestAttributes) RequestContextHolder.getRequestAttributes()).getRequest();
            String requestPath = request.getRequestURI();
            String httpMethod = request.getMethod();
            
            // Create and save performance record
            ControllerPerformance performance = ControllerPerformance.builder()
                    .controllerName(controllerName)
                    .methodName(methodName)
                    .executionTimeMs(executionTime)
                    .timestamp(LocalDateTime.now())
                    .requestPath(requestPath)
                    .httpMethod(httpMethod)
                    .isSuccess(isSuccess)
                    .statusCode(statusCode)
                    .errorMessage(errorMessage)
                    .build();
            
            repository.save(performance);
        }
    }
} 