package com.ssafy.baperang.global.util;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import com.ssafy.baperang.domain.user.repository.UserRepository;
import com.ssafy.baperang.global.exception.BaperangCustomException;
import com.ssafy.baperang.global.exception.BaperangErrorCode;
import com.ssafy.baperang.global.jwt.JwtService;

import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@Component
public class SecurityUtils {

    private final UserRepository userRepository;
    private final JwtService jwtService;

    public Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new BaperangCustomException(BaperangErrorCode.UNAUTHORIZED_ACCESS);
        }

        if (authentication.getPrincipal() instanceof Long) {
            return (Long) authentication.getPrincipal();
        }

        throw new BaperangCustomException(BaperangErrorCode.UNAUTHORIZED_ACCESS);
    }
}
