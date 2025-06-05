package com.ssafy.baperang.domain.user.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.ssafy.baperang.domain.user.entity.User;


@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    // 로그인 아이디 중복만 체크
    boolean existsByLoginId(String loginId);

    // 로그인 아이디로 사용자 찾기
    Optional<User> findByLoginId(String loginId);

    // 영양사 이름, 학교명, 도시로 사용자 찾기 (아이디 찾기용)
    @Query("SELECT u FROM User u WHERE u.nutritionistName = :nutritionistName " +
            "AND u.school.schoolName = :schoolName AND u.school.city = :city")
    Optional<User> findByNutritionistNameAndSchoolInfo(
            @Param("nutritionistName") String nutritionistName,
            @Param("schoolName") String schoolName,
            @Param("city") String city
    );

    // 로그인 ID, 영양사 이름, 학교명, 도시로 사용자 찾기 (비밀번호 변경용)
    @Query("SELECT u FROM User u WHERE u.loginId = :loginId " +
            "AND u.nutritionistName = :nutritionistName " +
            "AND u.school.schoolName = :schoolName " +
            "AND u.school.city = :city")
    Optional<User> findByLoginIdAndNutritionistNameAndSchoolInfo(
            @Param("loginId") String loginId,
            @Param("nutritionistName") String nutritionistName,
            @Param("schoolName") String schoolName,
            @Param("city") String city
    );
}