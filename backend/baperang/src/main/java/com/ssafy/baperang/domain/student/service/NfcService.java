package com.ssafy.baperang.domain.student.service;

import com.ssafy.baperang.domain.student.dto.request.NfcStudentRequestDto;

public interface NfcService {
    Object verifyStudentData(NfcStudentRequestDto requestDto);
    void saveBeforeImageUrls(NfcStudentRequestDto requestDto);
    void checkAfterImageUrl(NfcStudentRequestDto requestDto);

}