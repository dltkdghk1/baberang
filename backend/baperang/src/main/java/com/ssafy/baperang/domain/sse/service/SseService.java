package com.ssafy.baperang.domain.sse.service;

import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.ssafy.baperang.domain.sse.dto.response.LeftoverResponseDto;
import com.ssafy.baperang.domain.sse.dto.response.SatisfactionResponseDto;

public interface SseService {
    /**
     * SSE 연결을 위한 구독 메서드
     * 클라이언트의 SSE 연결 요청을 처리하고 SseEmitter를 반환
     * @return SseEmitter 객체
     */
    SseEmitter subscribe(String token, String schoolName);

    SatisfactionResponseDto processVote(String token, String schoolName, String menuName, int satisfactionScore);

    /**
     * 특정 학교의 잔반율 정보를 조회하고 SSE로 전송
     * @param userPk 사용자(또는 학생) ID - 사용자를 통해 학교 정보 조회
     * @return 잔반율 정보가 담긴 DTO
     */
    LeftoverResponseDto processLeftoverRate(Long userPk);
}
