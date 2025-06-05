package com.ssafy.baperang.global.jwt;

import java.io.IOException;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@Component
public class JwtFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        // 요청 헤더에서 Authorization 값 추출
        String authorizationHeader = request.getHeader("Authorization");
        
        // 토큰 추출
        String token = getTokenFromHeader(authorizationHeader);
        
        // 토큰 유효성 검사 및 Authentication 설정
        if (StringUtils.hasText(token) && jwtService.validateToken(token)) {
            String loginId = jwtService.getLoginId(token);
            
            // 인증 정보 생성
            UsernamePasswordAuthenticationToken authentication = 
                    new UsernamePasswordAuthenticationToken(loginId, null, null);
            
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            
            // SecurityContext에 인증 정보 저장
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }
        
        filterChain.doFilter(request, response);
    }
    
    // Authorization 헤더에서 토큰 추출
    private String getTokenFromHeader(String authorizationHeader) {
        if (StringUtils.hasText(authorizationHeader) && authorizationHeader.startsWith("Bearer ")) {
            return authorizationHeader.substring(7);
        }
        return null;
    }
}
