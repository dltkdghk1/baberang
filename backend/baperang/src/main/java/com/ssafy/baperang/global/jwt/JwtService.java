package com.ssafy.baperang.global.jwt;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Base64;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.ssafy.baperang.domain.user.repository.UserRepository;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@Component
public class JwtService {

    @Value("${JWT_SECRET}")
    private String secretKey;

    @Value("${jwt.access-token-validity-in-seconds}")
    private long accessTokenValidTime;

    @Value("${jwt.refresh-token-validity-in-seconds}")
    private long refreshTokenValidTime;

    private final UserRepository userRepository;

    private final Logger logger = LoggerFactory.getLogger(JwtService.class);

    // TimeZone 설정 추가
    private final ZoneId seoulZoneId = ZoneId.of("Asia/Seoul");

    // 객채 초기화, secretKey를 Base64로 인코딩
    @PostConstruct
    protected void init() {
        logger.info("JWT token Initialization");
        secretKey = Base64.getEncoder().encodeToString(secretKey.getBytes());
    }

    // JWT 액세스 토큰 생성
    public String createAccessToken(String loginId) {
        return createAccessToken(loginId, null);
    }
    
    // JWT 액세스 토큰 생성 (userId 포함)
    public String createAccessToken(String loginId, Long userId) {
        LocalDateTime now = LocalDateTime.now(seoulZoneId);
        LocalDateTime validity = now.plusSeconds(accessTokenValidTime);

        Date nowDate = Date.from(now.atZone(seoulZoneId).toInstant());
        Date validityDate = Date.from(validity.atZone(seoulZoneId).toInstant());
        
        logger.info("Token created for user: {}", loginId);
        logger.info("Current Time: {} : Validity time : {}", nowDate, validityDate);

        // Claims 객체 생성
        Map<String, Object> claims = new HashMap<>();
        claims.put("loginId", loginId);
        if (userId != null) {
            claims.put("userId", userId);
        }

        // 토큰 전달하기
        return Jwts.builder()
                .header().add("type", "JWT")
                .and()
                .claims(claims)
                .issuedAt(nowDate)
                .expiration(validityDate)
                .signWith(Keys.hmacShaKeyFor(secretKey.getBytes()))
                .compact();
    }

    // JWT 리프레시 토큰 생성
    public String createRefreshToken(String loginId) {
        return createRefreshToken(loginId, null);
    }
    
    // JWT 리프레시 토큰 생성 (userId 포함)
    public String createRefreshToken(String loginId, Long userId) {
        Date now = new Date();
        long validityInMilliseconds = refreshTokenValidTime * 1000L; // 초를 밀리초로 변환

        // Claims 객체 생성
        Map<String, Object> claims = new HashMap<>();
        claims.put("loginId", loginId);
        if (userId != null) {
            claims.put("userId", userId);
        }

        return Jwts.builder()
                .header().add("type", "JWT")
                .and()
                .claims(claims)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + validityInMilliseconds))
                .signWith(Keys.hmacShaKeyFor(secretKey.getBytes()))
                .compact();
    }
    
    // 토큰에서 회원 정보 추출
    public String getLoginId(String token) {
        Claims claims = parseClaims(token);
        return claims.get("loginId", String.class);
    }

    // 토큰에서 userId 추출
    public Long getUserId(String token) {
        Claims claims = parseClaims(token);
        return claims.get("userId", Long.class);
    }
    
    // 토큰의 유효성 + 만료일자 확인
    public boolean validateToken(String token) {
        try {
            Jws<Claims> claims = Jwts.parser()
                    .verifyWith(Keys.hmacShaKeyFor(secretKey.getBytes()))
                    .build()
                    .parseSignedClaims(token);
            
            return !claims.getPayload().getExpiration().before(new Date());
        } catch (JwtException | IllegalArgumentException e) {
            logger.error("Invalid JWT token: {}", e.getMessage());
            return false;
        }
    }
    
    // 토큰에서 클레임 정보 파싱
    private Claims parseClaims(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(Keys.hmacShaKeyFor(secretKey.getBytes()))
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (ExpiredJwtException e) {
            return e.getClaims();
        }
    }
}
