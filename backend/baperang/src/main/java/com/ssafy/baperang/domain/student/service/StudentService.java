package com.ssafy.baperang.domain.student.service;

import com.ssafy.baperang.domain.student.dto.request.SaveStudentLeftoverRequestDto;

public interface StudentService {
    // 학생 이름 목록 조회
    Object getAllStudentNames(Long userId);

    // 학생 상세 정보 조회
    Object getStudentDetail(Long userId, Long studentId);

    Object saveStudentLeftover(Long userId, SaveStudentLeftoverRequestDto requestDto);

    Object getStudentLeftover(Long userId, String leftoverDateStr, int grade, int classNum, int number);
}