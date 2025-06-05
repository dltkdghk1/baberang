package com.ssafy.baperang.domain.sse.controller;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.ssafy.baperang.domain.sse.dto.request.SatisfactionRequestDto;
import com.ssafy.baperang.domain.sse.dto.response.SatisfactionResponseDto;
import com.ssafy.baperang.domain.sse.service.SseService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/api/v1/sse")
@RequiredArgsConstructor
public class SseController {

    private final SseService satisfactionService;
    
    /**
     * SSE 연결을 위한 엔드포인트
     * 클라이언트는 이 엔드포인트로 EventSource 연결을 맺을 수 있음
     * @return SseEmitter 객체
     */
    @GetMapping(value = "/subscribe", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribe(
        @RequestHeader("Authorization") String authorizationHeader,
        @RequestParam("schoolName") String schoolName) {
        log.info("새로운 SSE 구독 요청 수신");
        String token = authorizationHeader.substring(7);

        return satisfactionService.subscribe(token, schoolName);
    }

    @PostMapping("/vote")
    public ResponseEntity<?> submitVote(
        @RequestHeader("Authorization") String authorizationHeader,
        @RequestBody SatisfactionRequestDto satisfactionRequestDto) {
        try {
            String token = authorizationHeader.substring(7);
            log.info("투표 처리 요청 수신");
            SatisfactionResponseDto satisfactionResponseDto = satisfactionService.processVote(
                token,
                satisfactionRequestDto.getSchoolName(),
                satisfactionRequestDto.getMenuname(),
                satisfactionRequestDto.getSatisfactionScore()
            );
            return ResponseEntity.ok(satisfactionResponseDto);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("투표 처리 중 오류 발생: " + e.getMessage());
        }
    }
} 