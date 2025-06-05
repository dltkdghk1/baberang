package com.ssafy.baperang.domain.school.entity;

import java.time.LocalDateTime;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "school")
@EntityListeners(AuditingEntityListener.class)
public class School {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "school_pk")
    private Long id;

    @Column(name = "school_name", nullable = false, length = 100)
    private String schoolName;

    @Column(name = "city", nullable = false, length = 20)
    private String city;

    @Column(name = "make_month")
    private Integer makeMonth;

    @CreatedDate
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Builder
    public School(String schoolName, String city) {
        this.schoolName = schoolName;
        this.city = city;
        this.makeMonth = 0;
    }
    
    public void updateMakeMonth(Integer month) {
        this.makeMonth = month;
    }
}
