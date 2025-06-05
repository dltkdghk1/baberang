package com.ssafy.baperang.global.config;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.Charset;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@Order(1)
public class CsvDataLoader implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;
    private int totalLines = 0;
    private int processedLines = 0;
    private int failedLines = 0;

    @Autowired
    public CsvDataLoader(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) throws Exception {
        // 데이터베이스 테이블에 이미 데이터가 있는지 확인
        Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM school", Integer.class);
        
        if (count != null && count > 10) {
            log.info("School 테이블에 이미 {} 개의 데이터가 존재합니다. CSV 로드를 건너뜁니다.", count);
            return;
        }
        
        log.info("School 테이블이 비어 있습니다. CSV 파일에서 학교 데이터 로드를 시작합니다.");
        loadSchoolData();
        log.info("완료: 총 {} 라인 중 {} 라인 처리 성공, {} 라인 실패", 
                 totalLines, processedLines, failedLines);
    }

    private void loadSchoolData() {
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(
                        Objects.requireNonNull(getClass().getResourceAsStream("/school_data.csv")),
                        Charset.forName("EUC-KR")))) {

            // 전체 라인 수 미리 계산
            countTotalLines();
            
            // 헤더 스킵
            String line = reader.readLine();
            if (line != null) {
                log.info("CSV 헤더: {}", line);
            }
            
            List<Object[]> batch = new ArrayList<>();
            int batchCount = 0;
            
            while ((line = reader.readLine()) != null) {
                try {
                    String[] data = line.split(",");
                    if (data.length >= 2) {
                        String schoolName = data[0].trim();
                        String city = data[1].trim();
                        LocalDateTime now = LocalDateTime.now();
                        
                        // 데이터 검증
                        if (schoolName.isEmpty() || city.isEmpty()) {
                            log.warn("유효하지 않은 데이터 스킵: {}", line);
                            failedLines++;
                            continue;
                        }
                        
                        batch.add(new Object[]{schoolName, city, now, now});
                        
                        // 500개씩 배치 처리
                        if (batch.size() >= 500) {
                            int inserted = executeBatch(batch);
                            processedLines += inserted;
                            batchCount++;
                            log.info("배치 #{} 처리 완료: {} 레코드 삽입", batchCount, inserted);
                            batch.clear();
                        }
                    } else {
                        log.warn("열 수가 부족한 행 스킵: {}", line);
                        failedLines++;
                    }
                } catch (Exception e) {
                    log.error("행 처리 중 오류 발생: {}, 오류: {}", line, e.getMessage());
                    failedLines++;
                }
            }
            
            // 남은 배치 처리
            if (!batch.isEmpty()) {
                int inserted = executeBatch(batch);
                processedLines += inserted;
                batchCount++;
                log.info("마지막 배치 #{} 처리 완료: {} 레코드 삽입", batchCount, inserted);
            }
            
            // 실제 처리된 데이터 수 확인
            int count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM school", Integer.class);
            log.info("데이터베이스의 school 테이블 레코드 수: {}", count);
            
        } catch (Exception e) {
            log.error("학교 데이터 로드 중 오류 발생: {}", e.getMessage(), e);
        }
    }
    
    private void countTotalLines() {
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(
                        Objects.requireNonNull(getClass().getResourceAsStream("/school_data.csv")),
                        Charset.forName("EUC-KR")))) {
            
            totalLines = 0;
            while (reader.readLine() != null) {
                totalLines++;
            }
            log.info("CSV 파일 총 라인 수: {} (헤더 포함)", totalLines);
            
        } catch (Exception e) {
            log.error("총 라인 수 계산 중 오류 발생: {}", e.getMessage());
        }
    }
    
    private int executeBatch(List<Object[]> batch) {
        try {
            int[] updateCounts = jdbcTemplate.batchUpdate(
                    "INSERT INTO school (school_name, city, created_at, updated_at) VALUES (?, ?, ?, ?)",
                    batch
            );
            
            // 실제 삽입된 레코드 수 계산
            int inserted = 0;
            for (int count : updateCounts) {
                if (count > 0) {
                    inserted += count;
                }
            }
            return inserted;
            
        } catch (DataAccessException e) {
            log.error("배치 실행 중 데이터베이스 오류: {}", e.getMessage());
            return 0;
        }
    }
}