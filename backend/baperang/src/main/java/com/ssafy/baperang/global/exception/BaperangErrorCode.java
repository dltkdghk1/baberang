package com.ssafy.baperang.global.exception;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * 커스텀 에러코드를 위한 enum
 */

@Getter
@AllArgsConstructor
public enum BaperangErrorCode {

    // Auth 관련 에러 (400-499)
    INVALID_LOGIN_VALUE(400, "C001", "잘못된 로그인 정보입니다."),
    USER_NOT_FOUND(404, "C002", "존재하지 않는 사용자입니다."),
    PASSWORD_NOT_MATCH(400, "C003", "비밀번호가 일치하지 않습니다."),
    DUPLICATE_USER(409, "C004", "이미 존재하는 사용자입니다."),
    INVALID_NICKNAME_LENGTH(400, "N002", "닉네임은 2자 이상 10자 이하로 입력해주세요."),
    UNAUTHORIZED_ACCESS(401, "C005", "인증되지 않은 접근입니다."),

    // Token 관련 에러 (400-499)
    REFRESH_TOKEN_NOT_FOUND(401, "T001", "리프레시 토큰이 없습니다."),
    INVALID_REFRESH_TOKEN(401, "T002", "유효하지 않은 리프레시 토큰입니다."),
    TOKEN_EXPIRED(401, "T003", "만료된 토큰입니다."),
    INVALID_TOKEN(401, "T004", "유효하지 않은 토큰입니다."),

    // 검증 관련 에러 (400-499)
    INVALID_INPUT_VALUE(400, "V001", "잘못된 입력값입니다."),
    SCHOOL_NOT_FOUND(404, "S001", "학교 정보를 찾을 수 없습니다."),

    // 서버 에러 (500-599)
    INTERNAL_SERVER_ERROR(500, "S001", "서버 내부 오류가 발생했습니다."),

    // 닉네임 관련 에러 (400-499)
    DUPLICATE_NICKNAME(409, "N001", "이미 사용 중인 닉네임입니다."),

    // 권한 관련 에러 (400-499)
    INVALID_ACCESS(403, "A001", "접근 권한이 없습니다."),

    // 학생 관련 에러
    STUDENT_NOT_FOUND(404, "ST101", "존재하지 않는 학생입니다."),

    // 잔반 관련 에러
    LEFTOVER_SAVE_FAILED(500, "LO001", "잔반 데이터 저장에 실패했습니다."),
    LEFTOVER_NOT_FOUND(404, "LO002", "잔반 데이터를 찾을 수 없습니다."),
    INVALID_LEFTOVER_RATE(400, "LO003", "유효하지 않은 잔반율입니다. 0~100 사이의 값을 입력해주세요."),

    // 메뉴관련
    MENU_NOT_FOUND(404, "M001", "메뉴를 찾을 수 없습니다."),
    ALREADY_MADE_MENU(400, "M002", "이미 메뉴 생성 완료입니다."),

    // 재고 관련
    RESOURCE_NOT_FOUND( 404, "R001", "요청한 리소스를 찾을 수 없습니다."),

    // 친구 관련 에러
    FRIEND_NOT_FOUND(404, "F001", "존재하지 않는 친구 요청입니다."),
    DUPLICATE_FRIEND_REQUEST(409, "F002", "이미 친구 요청을 보냈거나 친구 상태입니다."),
    INVALID_FRIEND_STATUS(400, "F003", "유효하지 않은 친구 상태입니다."),
    FRIEND_REQUEST_ALREADY_PROCESSED(400, "F004", "이미 처리된 친구 요청입니다."),
    NOT_FRIEND_USER(400, "F005", "친구가 아닌 유저입니다."),
    FRIEND_STATUS_REQUIRED(400, "F006", "친구 상태를 입력해주세요."),

    // 알림 관련 에러
    NOTIFICATION_NOT_FOUND(404, "N001", "알림을 찾을 수 없습니다."),
    NOTIFICATION_SEND_FAILED(500, "N002", "알림 전송에 실패했습니다."),
    NOTIFICATION_ALREADY_READ(400, "N003", "이미 읽은 알림입니다."),
    NOTIFICATION_ALREADY_DELETED(400, "N004", "이미 삭제된 알림입니다."),

    // AI 서버 관련 에러
    AI_IMAGE_PROCESSING_ERROR(500, "AI001", "이미지 처리 중 오류가 발생했습니다."),
    AI_SERVER_ERROR(500, "AI002", "AI 서버와 통신 중 오류가 발생했습니다."),
    AI_SERVER_CONNECTION_ERROR(500, "AI003", "AI 서버 연결 오류가 발생했습니다."),
    AI_SERVER_RESPONSE_ERROR(500, "AI004", "AI 서버 응답 처리 중 오류가 발생했습니다.");



    private final int status;
    private final String code;
    private final String message;
}
