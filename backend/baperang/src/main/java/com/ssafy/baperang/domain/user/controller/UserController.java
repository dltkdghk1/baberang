package com.ssafy.baperang.domain.user.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ssafy.baperang.domain.user.dto.request.FindIdRequestDto;
import com.ssafy.baperang.domain.user.dto.request.LoginRequestDto;
import com.ssafy.baperang.domain.user.dto.request.NewPasswordRequestDto;
import com.ssafy.baperang.domain.user.dto.request.SignupRequestDto;
import com.ssafy.baperang.domain.user.dto.request.UpdateUserRequestDto;
import com.ssafy.baperang.domain.user.dto.request.ValidateIdRequestDto;
import com.ssafy.baperang.domain.user.dto.response.ErrorResponseDto;
import com.ssafy.baperang.domain.user.dto.response.ValidateIdResponseDto;
import com.ssafy.baperang.domain.user.service.UserService;

import io.swagger.v3.oas.annotations.Operation;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController // REST API 컨트롤러임을 spring에 알려줌
@RequestMapping("/api/v1/user") // 이 컨트롤러의 기본 URL 경로를 설정
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @PostMapping("/signup")
    @Operation(summary = "회원가입", description = "회원가입 기능")
    public ResponseEntity<?> signup(@RequestBody SignupRequestDto requestDto) {
        log.info("signup 컨트롤러 함수 호출");
        Object result = userService.signup(requestDto);

        if (result instanceof ErrorResponseDto) {
            ErrorResponseDto errorResponse = (ErrorResponseDto) result;
            log.info("signup 컨트롤러 함수 에러 응답");
            return ResponseEntity.status(errorResponse.getStatus()).body(result);
        }

        log.info("signup 컨트롤러 함수 정상 응답");
        return ResponseEntity.ok(result);
    }

    @PostMapping("/validate-id")
    @Operation(summary = "아이디 중복 검사", description = "아이디 중복 검사 기능")
    public ResponseEntity<ValidateIdResponseDto> validateId(@RequestBody ValidateIdRequestDto requestDto) {
        log.info("validateId 컨트롤러 함수 호출");
        boolean isValid = userService.isLoginIdAvailable(requestDto.getLoginId());

        ValidateIdResponseDto responseDto = ValidateIdResponseDto.builder()
                .valid(isValid)
                .build();

        log.info("validateId 컨트롤러 함수 응답");
        return ResponseEntity.ok(responseDto);
    }

    @PostMapping("/login")
    @Operation(summary = "로그인", description = "로그인 기능")
    public ResponseEntity<?> login(@RequestBody LoginRequestDto requestDto, HttpServletResponse response) {
        log.info("login 컨트롤러 함수 호출");
        Object result = userService.login(requestDto, response);

        if (result instanceof ErrorResponseDto) {
            ErrorResponseDto errorResponse = (ErrorResponseDto) result;
            log.info("login 컨트롤러 함수 에러 응답");
            return ResponseEntity.status(errorResponse.getStatus()).body(result);
        }

        log.info("login 컨트롤러 함수 정상 응답");
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/logout")
    @Operation(summary = "로그아웃", description = "로그아웃 기능")
    public ResponseEntity<?> logout
            (@RequestHeader("Authorization") String authorizationHeader,
             HttpServletResponse response) {
        log.info("logout 컨트롤러 함수 호출");

        String token = authorizationHeader.substring(7).trim();

        Object result = userService.logout(token, response);

        if (result instanceof ErrorResponseDto) {
            ErrorResponseDto errorRespnse = (ErrorResponseDto) result;
            log.info("logout 컨트롤러 함수 에러 응답");
            return ResponseEntity.status(errorRespnse.getStatus()).body(result);
        }
        log.info("logout 컨트롤러 함수 정상 응답");
        return ResponseEntity.ok(result);
    }
    
    @GetMapping("/validate-token")
    @Operation(summary = "토큰 유효성 검사", description = "토큰 유효성 검사 기능")
    public ResponseEntity<?> validateToken(@RequestHeader("Authorization") String authorizationHeader) {
        log.info("validateToken 컨트롤러 함수 호출");

        String token = authorizationHeader.substring(7).trim();

        Object result = userService.validateToken(token);

        if (result instanceof ErrorResponseDto) {
            ErrorResponseDto errorResponse = (ErrorResponseDto) result;
            log.info("validateToken 컨트롤러 함수 에러 응답");
            return ResponseEntity.status(errorResponse.getStatus()).body(result);
        }

        log.info("validateToken 컨트롤러 함수 정상 응답");
        return ResponseEntity.ok(result);
    }

    @PostMapping("/refresh")
    @Operation(summary = "리프레시 토큰 갱신", description = "리프레시 토큰 갱신 기능")
    public ResponseEntity<?> refreshAccessToken(@CookieValue(name = "refreshToken", required = false) String refreshToken,
                                              HttpServletResponse response) {
        log.info("refreshAccessToken 컨트롤러 함수 호출");
        
        if (refreshToken == null) {
            log.info("refreshAccessToken - 리프레시 토큰 없음");
            ErrorResponseDto errorResponse = ErrorResponseDto.of(com.ssafy.baperang.global.exception.BaperangErrorCode.INVALID_REFRESH_TOKEN);
            return ResponseEntity.status(errorResponse.getStatus()).body(errorResponse);
        }
        
        Object result = userService.refreshAccessToken(refreshToken, response);
        
        if (result instanceof ErrorResponseDto) {
            ErrorResponseDto errorResponse = (ErrorResponseDto) result;
            log.info("refreshAccessToken 컨트롤러 함수 에러 응답");
            return ResponseEntity.status(errorResponse.getStatus()).body(result);
        }
        
        log.info("refreshAccessToken 컨트롤러 함수 정상 응답");
        return ResponseEntity.ok(result);
    }

    @GetMapping("/profile")
    @Operation(summary = "회원정보 조회", description = "회원정보 조회 기능")
    public ResponseEntity<?> getUserDetail(
            @RequestHeader("Authorization") String authorizationHeader) {
        log.info("getUserDetail 컨트롤러 함수 호출");

        String token = authorizationHeader.substring(7); // "Bearer " 이후의 토큰 추출

        Object result = userService.getUserDetail(token);

        if (result instanceof ErrorResponseDto) {
            ErrorResponseDto errorResponse = (ErrorResponseDto) result;
            log.info("getUserDetail 컨트롤러 함수 에러 응답");
            return ResponseEntity.status(errorResponse.getStatus()).body(result);
        }

        log.info("getUserDetail 컨트롤러 함수 정상 응답");
        return ResponseEntity.ok(result);
    }

    @PutMapping("/profile")
    @Operation(summary = "회원정보 수정", description = "회원정보 수정 기능")
    public ResponseEntity<?> updateUser(
            @RequestBody UpdateUserRequestDto requestDto,
            @RequestHeader("Authorization") String authorizationHeader) {
        log.info("updateUser 컨트롤러 함수 호출");

        String token = authorizationHeader.substring(7); // "Bearer " 이후의 토큰 추출

        Object result = userService.updateUser(token, requestDto);

        if (result instanceof ErrorResponseDto) {
            ErrorResponseDto errorResponse = (ErrorResponseDto) result;
            log.info("updateUser 컨트롤러 함수 에러 응답");
            return ResponseEntity.status(errorResponse.getStatus()).body(result);
        }

        log.info("updateUser 컨트롤러 함수 정상 응답");
        return ResponseEntity.ok(result);
    }

    @PostMapping("/find-id")
    @Operation(summary = "ID 찾기", description = "ID 찾기 기능")
    public ResponseEntity<?> findUserId(@RequestBody FindIdRequestDto requestDto) {
        log.info("findUserId 컨트롤러 함수 호출");

        Object result = userService.findUserId(requestDto);

        if (result instanceof ErrorResponseDto) {
            ErrorResponseDto errorResponse = (ErrorResponseDto) result;
            log.info("findUserId 컨트롤러 함수 에러 응답");
            return ResponseEntity.status(errorResponse.getStatus()).body(result);
        }

        log.info("findUserId 컨트롤러 함수 정상 응답");
        return ResponseEntity.ok(result);
    }

    @PostMapping("/new-password")
    @Operation(summary = "비밀번호 변경", description = "비밀번호 찾기 및 변경 기능")
    public ResponseEntity<?> changePassword(@RequestBody NewPasswordRequestDto requestDto) {
        log.info("changePassword 컨트롤러 함수 호출");

        Object result = userService.changePassword(requestDto);

        if (result instanceof ErrorResponseDto) {
            ErrorResponseDto errorResponse = (ErrorResponseDto) result;
            log.info("changePassword 컨트롤러 함수 에러 응답");
            return ResponseEntity.status(errorResponse.getStatus()).body(result);
        }

        log.info("changePassword 컨트롤러 함수 정상 응답");
        return ResponseEntity.ok(result);
    }
}