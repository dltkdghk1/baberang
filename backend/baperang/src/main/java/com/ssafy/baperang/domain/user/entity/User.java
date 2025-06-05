package com.ssafy.baperang.domain.user.entity;

import com.ssafy.baperang.domain.school.entity.School;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;


@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "user")
@EntityListeners(AuditingEntityListener.class)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_pk")
    private Long id;

    @Column(name = "login_id", unique = true, nullable = false, length = 20) // 중복값 허용x, null값 허용 x
    private String loginId;

    // 암호화 필요
    @Column(name = "password", nullable = false, length = 60)
    private String password;

    @Column(name = "nutritionist_name", nullable = false, length = 10)
    private String nutritionistName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "school_pk", nullable = false)
    private School school;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Builder
    public User(String loginId, String password, String nutritionistName, School school) {
        this.loginId = loginId;
        this.password = password;
        this.nutritionistName = nutritionistName;
        this.school = school;
    }

    public void updateUser(String nutritionistName, String password, School school) {
        if (nutritionistName != null && !nutritionistName.isEmpty()) {
            this.nutritionistName = nutritionistName;
        }

        if (password != null && !password.isEmpty()) {
            this.password = password;
        }

        if (school != null) {
            this.school = school;
        }
    }
}