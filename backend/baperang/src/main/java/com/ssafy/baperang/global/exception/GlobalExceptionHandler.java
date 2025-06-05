package com.ssafy.baperang.global.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.HttpMediaTypeNotAcceptableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.async.AsyncRequestNotUsableException;

import io.jsonwebtoken.JwtException;
import jakarta.validation.ValidationException;

@ControllerAdvice
public class GlobalExceptionHandler {
    private final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * 글로벌 exception handler
     * 핸들하고자 하는 에러에 대한 핸들링 코드를 작성하면 됨
     */

    // SSE 관련 예외 처리 (클라이언트 연결 끊김)
    @ExceptionHandler(AsyncRequestNotUsableException.class)
    public ResponseEntity<ErrorResponse> handleAsyncRequestNotUsableException(AsyncRequestNotUsableException ex) {
        // 로그만 남기고 기본 200 OK 응답 리턴 (이 응답은 사용되지 않음)
        log.debug("SSE 연결 종료 (무시됨): {}", ex.getMessage());
        return ResponseEntity.ok().build();
    }

    // HTTP 메소드 지원하지 않음 예외 처리 (SSE 재연결 시 발생 가능)
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMethodNotSupportedException(HttpRequestMethodNotSupportedException ex) {
        // SSE 클라이언트가 잘못된 HTTP 메소드로 재연결 시도할 때 발생하는 오류
        // 로그 레벨을 debug로 낮추고 일반 응답 반환
        log.debug("지원하지 않는 HTTP 메소드 요청 (무시됨): {}", ex.getMessage());
        ErrorResponse response = ErrorResponse.of(BaperangErrorCode.INVALID_INPUT_VALUE);
        return ResponseEntity.status(405)
                .contentType(MediaType.APPLICATION_JSON)
                .body(response);
    }
    
    // JWT 관련 예외 처리 (SSE 재연결 시 발생 가능)
    @ExceptionHandler(JwtException.class)
    public ResponseEntity<ErrorResponse> handleJwtException(JwtException ex) {
        // SSE 클라이언트가 잘못된 토큰으로 재연결 시도할 때 발생하는 오류
        // 로그 레벨을 debug로 낮추고 일반 응답 반환
        log.debug("JWT 토큰 오류 (무시됨): {}", ex.getMessage());
        ErrorResponse response = ErrorResponse.of(BaperangErrorCode.INVALID_TOKEN);
        return ResponseEntity.status(401)
                .contentType(MediaType.APPLICATION_JSON)
                .body(response);
    }

    // 커스텀 예외 처리
    @ExceptionHandler(BaperangCustomException.class)
    public ResponseEntity<ErrorResponse> handleBaperangCustomException(BaperangCustomException ex) {
        BaperangErrorCode errorCode = ex.getErrorCode();
        ErrorResponse response = ErrorResponse.of(errorCode);
        log.error("커스텀 예외 발생: {}", ex.getMessage());
        return ResponseEntity.status(errorCode.getStatus())
                .contentType(MediaType.APPLICATION_JSON)
                .body(response);
    }

    // 인증 관련 예외 처리
    @ExceptionHandler({BadCredentialsException.class, UsernameNotFoundException.class})
    public ResponseEntity<ErrorResponse> handleAuthenticationException(Exception ex) {
        BaperangErrorCode errorCode = BaperangErrorCode.INVALID_LOGIN_VALUE;
        ErrorResponse response = ErrorResponse.of(errorCode);
        log.error("인증 예외 발생: {}", ex.getMessage());
        return ResponseEntity.status(errorCode.getStatus())
                .contentType(MediaType.APPLICATION_JSON)
                .body(response);
    }

    // IllegalArgumentException, IllegalStateException 처리
    @ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class})
    public ResponseEntity<ErrorResponse> handleIllegalException(Exception ex) {
        BaperangErrorCode errorCode = BaperangErrorCode.INVALID_INPUT_VALUE;
        ErrorResponse response = ErrorResponse.of(errorCode);
        log.error("입력값 예외 발생: {}", ex.getMessage());
        return ResponseEntity.status(errorCode.getStatus())
                .contentType(MediaType.APPLICATION_JSON)
                .body(response);
    }
    
    // 요청 데이터 검증 실패 예외 처리
    @ExceptionHandler({MethodArgumentNotValidException.class, ValidationException.class})
    public ResponseEntity<ErrorResponse> handleValidationException(Exception ex) {
        ErrorResponse response = ErrorResponse.of(BaperangErrorCode.INVALID_INPUT_VALUE);
        log.error("검증 예외 발생: {}", ex.getMessage());
        return ResponseEntity.status(400)
                .contentType(MediaType.APPLICATION_JSON)
                .body(response);
    }

    // 권한 관련 예외 처리
    @ExceptionHandler({AuthorizationDeniedException.class, AccessDeniedException.class})
    public ResponseEntity<ErrorResponse> handleAuthorizationException(Exception ex) {
        ErrorResponse response = ErrorResponse.of(BaperangErrorCode.INVALID_ACCESS);
        log.error("권한 예외 발생: {}", ex.getMessage());
        return ResponseEntity.status(403)
                .contentType(MediaType.APPLICATION_JSON)
                .body(response);
    }
    
    // MediaType 관련 예외 처리
    @ExceptionHandler(HttpMediaTypeNotAcceptableException.class)
    public ResponseEntity<ErrorResponse> handleHttpMediaTypeNotAcceptableException(HttpMediaTypeNotAcceptableException ex) {
        ErrorResponse response = ErrorResponse.of(BaperangErrorCode.INTERNAL_SERVER_ERROR);
        log.error("미디어 타입 예외 발생: {}", ex.getMessage());
        return ResponseEntity.status(406)
                .contentType(MediaType.APPLICATION_JSON)
                .body(response);
    }

    // 기타 예외 처리
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleException(Exception ex) {
        ErrorResponse response = ErrorResponse.of(BaperangErrorCode.INTERNAL_SERVER_ERROR);
        log.error("서버 예외 발생: {}", ex.getMessage(), ex);
        return ResponseEntity.status(500)
                .contentType(MediaType.APPLICATION_JSON)
                .body(response);
    }
}
