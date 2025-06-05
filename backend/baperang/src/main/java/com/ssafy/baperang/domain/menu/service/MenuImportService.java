package com.ssafy.baperang.domain.menu.service;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

public interface MenuImportService {

    /** 엑셀 파일 → JSON 문자열 */
    String convertExcelToJson(MultipartFile file) throws IOException;

    /** 엑셀 Byte → JSON 문자열 */
    String convertExcelToJsonFromBytes(byte[] fileData) throws IOException;

    /** JSON 문자열 → Menu 엔티티 저장 */
    void importMenusFromJson(String jsonData, Long schoolId) throws IOException;
}