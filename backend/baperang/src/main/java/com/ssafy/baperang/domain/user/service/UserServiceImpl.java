package com.ssafy.baperang.domain.user.service;

import com.ssafy.baperang.domain.user.dto.request.*;
import com.ssafy.baperang.domain.user.dto.response.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;

import com.ssafy.baperang.domain.school.entity.School;
import com.ssafy.baperang.domain.school.repository.SchoolRepository;
import com.ssafy.baperang.domain.user.dto.response.ValidateTokenResponseDto;
import com.ssafy.baperang.domain.user.entity.User;
import com.ssafy.baperang.domain.user.repository.UserRepository;
import com.ssafy.baperang.global.exception.BaperangErrorCode;
import com.ssafy.baperang.global.jwt.JwtService;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
@Slf4j
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService{

    private final UserRepository userRepository;
    private final SchoolRepository schoolRepository;
    private final BCryptPasswordEncoder bCryptPasswordEncoder;
    private final JwtService jwtService;

    @Transactional
    public Object signup(SignupRequestDto requestDto) {
        log.info("signup 함수 실행");
        // 중복 ID 검사
        if (userRepository.existsByLoginId(requestDto.getLoginId())) {
            return ErrorResponseDto.of(BaperangErrorCode.DUPLICATE_USER);
        }

        try {
            School school = schoolRepository.findBySchoolNameAndCity(
                            requestDto.getSchoolName(), requestDto.getCity())
                    .orElseGet(() -> {
                        log.info("signup() - 새 학교 생성");
                        School newSchool = School.builder()
                                .schoolName(requestDto.getSchoolName())
                                .city(requestDto.getCity())
                                .build();
                        return schoolRepository.saveAndFlush(newSchool);
                    });

            String encodedPassword = bCryptPasswordEncoder.encode(requestDto.getPassword());

            User user = User.builder()
                    .loginId(requestDto.getLoginId())
                    .password(encodedPassword)
                    .nutritionistName(requestDto.getNutritionistName())
                    .school(school)
                    .build();

            userRepository.saveAndFlush(user);

            SignupResponseDto.SignupContent content = SignupResponseDto.SignupContent.builder()
                    .loginId(user.getLoginId())
                    .nutritionistName(user.getNutritionistName())
                    .city(user.getSchool().getCity())
                    .schoolName(user.getSchool().getSchoolName())
                    .build();

            log.info("signup() 함수 성공 종료");
            return SignupResponseDto.builder()
                    .message("회원가입이 완료 되었습니다.")
                    .content(content)
                    .build();
        } catch (Exception e) {
            log.info("signup 함수 예외 발생: {}", e.getMessage());
            // 예외 발생 시 서버 내부 오류로 처리
            return ErrorResponseDto.of(BaperangErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    @Transactional(readOnly = true)
    public boolean isLoginIdAvailable(String loginId) {
        log.info("isLoginIdAvailable 실행");
        boolean result = !userRepository.existsByLoginId(loginId);
        log.info("isLoginIdAvailable 종료");
        return result;
    }

    @Transactional(readOnly = true)
    public Object login(LoginRequestDto requestDto, HttpServletResponse response) {
        log.info("login 함수 실행");
        // 로그인 ID 확인
        User user = userRepository.findByLoginId(requestDto.getLoginId())
                .orElse(null);

        // 사용자를 찾지 못한 경우
        if (user == null) {
            log.info("login() - 사용자 없음");
            return ErrorResponseDto.of(BaperangErrorCode.INVALID_LOGIN_VALUE);
        }

        // 비밀번호 확인
        if (!bCryptPasswordEncoder.matches(requestDto.getPassword(), user.getPassword())) {
            log.info("login - 비밀번호 불일치");
            return ErrorResponseDto.of(BaperangErrorCode.INVALID_LOGIN_VALUE);
        }

        // JWT 토큰 생성 (userId 포함)
        String accessToken = jwtService.createAccessToken(user.getLoginId(), user.getId());
        String refreshToken = jwtService.createRefreshToken(user.getLoginId(), user.getId());
        
        // Access Token을 헤더에 추가
        response.setHeader("Authorization", "Bearer " + accessToken);
        
        // Refresh Token을 쿠키에 추가
        Cookie refreshTokenCookie = new Cookie("refreshToken", refreshToken);
        refreshTokenCookie.setHttpOnly(true);
        refreshTokenCookie.setSecure(true); // HTTPS에서만 전송
        refreshTokenCookie.setPath("/");
        refreshTokenCookie.setMaxAge(7 * 24 * 60 * 60); // 7일간 유효
        response.addCookie(refreshTokenCookie);

        log.info("login 함수 성공 종료");
        
        // 성공 시 빈 응답 본문 반환 (필요한 정보는 모두 토큰에 있음)
        return new LoginResponseDto();
    }

    @Transactional
    public Object logout(String token, HttpServletResponse response) {
        log.info("logout 함수 실행");

        // 토큰 유효성 검사
        if (!jwtService.validateToken(token)) {
            log.info("logout - 토큰 유효하지 않음");
            return ErrorResponseDto.of(BaperangErrorCode.INVALID_TOKEN);
        }

        Long userPk = jwtService.getUserId(token);

        // 사용자 존재 여부 확인
        User user = userRepository.findById(userPk)
                .orElse(null);

        if (user == null) {
            log.info("logout - 사용자 없음");
            return ErrorResponseDto.of(BaperangErrorCode.USER_NOT_FOUND);
        }
        try {
            // 쿠키 삭제
            Cookie cookie = new Cookie("refreshToken", null);
            cookie.setMaxAge(0);
            cookie.setPath("/");
            cookie.setHttpOnly(true);
            cookie.setSecure(true); // HTTPS에서만 전송
            response.addCookie(cookie);

            // 성공 응답 반환
            return LogoutResponseDto.builder()
                    .message("로그아웃이 완료되었습니다.")
                    .build();
        } catch (Exception e) {
            return ErrorResponseDto.of(BaperangErrorCode.INTERNAL_SERVER_ERROR);
        }
    }
    
    @Transactional(readOnly = true)
    public Object refreshAccessToken(String refreshToken, HttpServletResponse response) {
        
        // refreshToken 검증
        if (!jwtService.validateToken(refreshToken)) {
            log.info("refreshAccessToken - 리프레시 토큰 유효하지 않음");
            
            // 유효하지 않은 리프레시 토큰을 쿠키에서 삭제
            Cookie cookie = new Cookie("refreshToken", null);
            cookie.setMaxAge(0);
            cookie.setPath("/");
            cookie.setHttpOnly(true);
            cookie.setSecure(true); // HTTPS에서만 전송
            response.addCookie(cookie);
            
            return ErrorResponseDto.of(BaperangErrorCode.INVALID_REFRESH_TOKEN);
        }
        
        // 토큰에서 loginId와 userId 추출
        String loginId = jwtService.getLoginId(refreshToken);
        Long userId = jwtService.getUserId(refreshToken);
        
        // 사용자 존재 확인
        User user = userRepository.findByLoginId(loginId)
                .orElse(null);
                
        if (user == null) {
            log.info("refreshAccessToken - 사용자 없음");
            
            // 사용자가 존재하지 않을 경우에도 쿠키 삭제
            Cookie cookie = new Cookie("refreshToken", null);
            cookie.setMaxAge(0);
            cookie.setPath("/");
            cookie.setHttpOnly(true);
            cookie.setSecure(true); // HTTPS에서만 전송
            response.addCookie(cookie);
            
            return ErrorResponseDto.of(BaperangErrorCode.USER_NOT_FOUND);
        }
        
        // 새 accessToken 발급 (userId 포함)
        String newAccessToken = jwtService.createAccessToken(loginId, userId);
        
        // 응답 헤더에 새 액세스 토큰 추가
        response.setHeader("Authorization", "Bearer " + newAccessToken);
        // 빈 응답 본문 반환
        return new LoginResponseDto();
    }
    @Transactional(readOnly = true)
    public Object getUserDetail(String token) {
        log.info("getUserDetail 함수 실행");

        // 토큰 유효성 검사
        if (!jwtService.validateToken(token)) {
            log.info("getUserDetail - 토큰 유효하지 않음");
            return ErrorResponseDto.of(BaperangErrorCode.INVALID_TOKEN);
        }

        // 토큰에서 유저 ID 추출
        Long userId = jwtService.getUserId(token);

        // 사용자 존재 여부 확인
        User user = userRepository.findById(userId)
                .orElse(null);

        if (user == null) {
            log.info("getUserDetail - 사용자 없음");
            return ErrorResponseDto.of(BaperangErrorCode.USER_NOT_FOUND);
        }

        // 사용자 정보 DTO로 변환하여 반환
        UserDetailResponseDto responseDto = UserDetailResponseDto.builder()
                .loginId(user.getLoginId())
                .nutritionistName(user.getNutritionistName())
                .schoolName(user.getSchool().getSchoolName())
                .city(user.getSchool().getCity())
                .build();

        log.info("getUserDetail 함수 성공 종료");
        return responseDto;
    }

    @Transactional
    public Object updateUser(String token, UpdateUserRequestDto requestDto) {
        log.info("updateUser 함수 실행");

        // 토큰 유효성 검사
        if (!jwtService.validateToken(token)) {
            log.info("updateUser - 토큰 유효하지 않음");
            return ErrorResponseDto.of(BaperangErrorCode.INVALID_TOKEN);
        }

        // 토큰에서 유저 ID 추출
        Long userId = jwtService.getUserId(token);

        // 사용자 존재 여부 확인
        User user = userRepository.findById(userId)
                .orElse(null);

        if (user == null) {
            log.info("updateUser - 사용자 없음");
            return ErrorResponseDto.of(BaperangErrorCode.USER_NOT_FOUND);
        }

        try {
            // 변경 메시지 구성
            StringBuilder messageBuilder = new StringBuilder();

            // 영양사 이름 변경 검사
            if (requestDto.getNutritionistName() != null && !requestDto.getNutritionistName().isEmpty()
                    && !requestDto.getNutritionistName().equals(user.getNutritionistName())) {
                messageBuilder.append("이름이 변경되었습니다. ");
                log.info("updateUser - 영양사 이름 변경: {} -> {}",
                        user.getNutritionistName(), requestDto.getNutritionistName());
            }

            // 비밀번호 변경 검사
            if (requestDto.getPassword() != null && !requestDto.getPassword().isEmpty()) {
                messageBuilder.append("비밀번호가 변경되었습니다. ");
                log.info("updateUser - 비밀번호 변경됨");
            }

            // 학교 정보 변경 검사
            boolean schoolChanged = false;
            School school = null;
            if (requestDto.getSchoolName() != null && requestDto.getCity() != null) {
                // 현재 학교와 다른지 확인
                if (!requestDto.getSchoolName().equals(user.getSchool().getSchoolName()) ||
                        !requestDto.getCity().equals(user.getSchool().getCity())) {

                    schoolChanged = true;
                    school = schoolRepository.findBySchoolNameAndCity(
                                    requestDto.getSchoolName(), requestDto.getCity())
                            .orElseGet(() -> {
                                log.info("updateUser() - 새 학교 생성");
                                School newSchool = School.builder()
                                        .schoolName(requestDto.getSchoolName())
                                        .city(requestDto.getCity())
                                        .build();
                                return schoolRepository.saveAndFlush(newSchool);
                            });

                    messageBuilder.append("학교 정보가 변경되었습니다. ");
                    log.info("updateUser - 학교 정보 변경: {}({}) -> {}({})",
                            user.getSchool().getSchoolName(), user.getSchool().getCity(),
                            requestDto.getSchoolName(), requestDto.getCity());
                } else {
                    // 학교 정보가 동일한 경우 null로 설정하여 업데이트하지 않음
                    school = null;
                }
            }

            // 아무 변경사항이 없는 경우
            if (messageBuilder.length() == 0) {
                messageBuilder.append("변경된 정보가 없습니다.");
                log.info("updateUser - 변경 사항 없음");
            }

            // 비밀번호 암호화 (비밀번호가 변경된 경우에만)
            String encodedPassword = null;
            if (requestDto.getPassword() != null && !requestDto.getPassword().isEmpty()) {
                encodedPassword = bCryptPasswordEncoder.encode(requestDto.getPassword());
            }

            // 사용자 정보 업데이트
            user.updateUser(
                    requestDto.getNutritionistName(),
                    encodedPassword,
                    schoolChanged ? school : null
            );

            // 변경 사항 저장
            userRepository.saveAndFlush(user);

            // 응답 DTO 생성
            UpdateUserResponseDto.UpdateUserContent content = UpdateUserResponseDto.UpdateUserContent.builder()
                    .loginId(user.getLoginId())
                    .nutritionistName(user.getNutritionistName())
                    .schoolName(user.getSchool().getSchoolName())
                    .city(user.getSchool().getCity())
                    .build();

            log.info("updateUser 함수 성공 종료");
            return UpdateUserResponseDto.builder()
                    .message(messageBuilder.toString().trim())
                    .content(content)
                    .build();

        } catch (Exception e) {
            log.info("updateUser 함수 예외 발생: {}", e.getMessage());
            return ErrorResponseDto.of(BaperangErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    @Transactional(readOnly = true)
    public Object validateToken(String token) {
        
        if (!jwtService.validateToken(token)) {
            log.info("validateToken - 토큰 유효하지 않음");
            return ErrorResponseDto.of(BaperangErrorCode.INVALID_TOKEN);
        }

        return ValidateTokenResponseDto.builder()
                .message("토큰 유효함")
                .build();
    }

    @Override
    @Transactional
    public Object findUserId(FindIdRequestDto requestDto) {
        log.info("findUserId 함수 실행");

        try {
            if (requestDto.getNutritionistName() == null || requestDto.getNutritionistName().trim().isEmpty()) {
                log.info("영양사 이름 입력되지 않음");
                return ErrorResponseDto.of(BaperangErrorCode.INVALID_INPUT_VALUE);
            }

            if (requestDto.getSchoolName() == null || requestDto.getSchoolName().trim().isEmpty()) {
                log.info("학교명 입력되지 않음");
                return ErrorResponseDto.of(BaperangErrorCode.INVALID_INPUT_VALUE);
            }

            if (requestDto.getCity() == null || requestDto.getCity().trim().isEmpty()) {
                log.info("도시 입력되지 않음");
                return ErrorResponseDto.of(BaperangErrorCode.INVALID_INPUT_VALUE);
            }

            User user = userRepository.findByNutritionistNameAndSchoolInfo(
                    requestDto.getNutritionistName().trim(),
                    requestDto.getSchoolName().trim(),
                    requestDto.getCity().trim()
            ).orElse(null);

            if (user == null) {
                log.info("해당 정보와 일치하는 사용자를 찾을 수 없음");
                return ErrorResponseDto.of(BaperangErrorCode.USER_NOT_FOUND);
            }

            FindIdResponseDto responseDto = FindIdResponseDto.builder()
                    .loginId(user.getLoginId())
                    .build();

            log.info("findUserId 함수 성공 종료 - loginId: {}", user.getLoginId());
            return responseDto;
        } catch (Exception e) {
            log.error("findUserId 함수 예외 발생: {}", e.getMessage(), e);
            return ErrorResponseDto.of(BaperangErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    @Override
    @Transactional
    public Object changePassword(NewPasswordRequestDto requestDto) {
        log.info("changePassword 함수 실행");

        try {
            // 입력값 검증
            if (requestDto.getLoginId() == null || requestDto.getLoginId().trim().isEmpty()) {
                log.info("changePassword - 로그인 ID가 입력되지 않음");
                return ErrorResponseDto.of(BaperangErrorCode.INVALID_INPUT_VALUE);
            }

            if (requestDto.getNutritionistName() == null || requestDto.getNutritionistName().trim().isEmpty()) {
                log.info("changePassword - 영양사 이름이 입력되지 않음");
                return ErrorResponseDto.of(BaperangErrorCode.INVALID_INPUT_VALUE);
            }

            if (requestDto.getSchoolName() == null || requestDto.getSchoolName().trim().isEmpty()) {
                log.info("changePassword - 학교명이 입력되지 않음");
                return ErrorResponseDto.of(BaperangErrorCode.INVALID_INPUT_VALUE);
            }

            if (requestDto.getCity() == null || requestDto.getCity().trim().isEmpty()) {
                log.info("changePassword - 도시명이 입력되지 않음");
                return ErrorResponseDto.of(BaperangErrorCode.INVALID_INPUT_VALUE);
            }

            if (requestDto.getNewPassword() == null || requestDto.getNewPassword().trim().isEmpty()) {
                log.info("changePassword - 새 비밀번호가 입력되지 않음");
                return ErrorResponseDto.of(BaperangErrorCode.INVALID_INPUT_VALUE);
            }

            // 사용자 조회 (모든 정보가 일치하는 사용자 찾기)
            User user = userRepository.findByLoginIdAndNutritionistNameAndSchoolInfo(
                    requestDto.getLoginId().trim(),
                    requestDto.getNutritionistName().trim(),
                    requestDto.getSchoolName().trim(),
                    requestDto.getCity().trim()
            ).orElse(null);

            if (user == null) {
                log.info("changePassword - 해당 정보와 일치하는 사용자를 찾을 수 없음");
                return ErrorResponseDto.of(BaperangErrorCode.USER_NOT_FOUND);
            }

            // 새 비밀번호 암호화
            String encodedNewPassword = bCryptPasswordEncoder.encode(requestDto.getNewPassword());

            // 비밀번호 업데이트 (User 엔티티의 updateUser 메서드 활용)
            user.updateUser(null, encodedNewPassword, null);

            // 변경 사항 저장
            userRepository.saveAndFlush(user);

            log.info("changePassword 함수 성공 종료 - loginId: {}", user.getLoginId());

            // 성공 응답 반환
            return NewPasswordResponseDto.builder()
                    .message("비밀번호 변경이 완료 되었습니다.")
                    .build();

        } catch (Exception e) {
            log.error("changePassword 함수 예외 발생: {}", e.getMessage(), e);
            return ErrorResponseDto.of(BaperangErrorCode.INTERNAL_SERVER_ERROR);
        }
    }
}
