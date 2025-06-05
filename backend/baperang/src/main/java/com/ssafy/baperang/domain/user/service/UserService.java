package com.ssafy.baperang.domain.user.service;

import com.ssafy.baperang.domain.user.dto.request.*;

import jakarta.servlet.http.HttpServletResponse;

public interface UserService {
    public Object signup(SignupRequestDto requestDto);
    public boolean isLoginIdAvailable(String loginId);
    public Object login(LoginRequestDto requestDto, HttpServletResponse response);
    public Object logout(String token, HttpServletResponse response);
    public Object refreshAccessToken(String refreshToken, HttpServletResponse response);
    public Object updateUser(String token, UpdateUserRequestDto requestDto);
    public Object getUserDetail(String token);
    public Object validateToken(String token);
    public Object findUserId(FindIdRequestDto requestDto);
    public Object changePassword(NewPasswordRequestDto requestDto);
}
