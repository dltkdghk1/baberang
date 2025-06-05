package com.ssafy.baperang.domain.holiday.entity;

import java.time.LocalDate;
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
@Table(name = "holiday")
@EntityListeners(AuditingEntityListener.class)
public class Holiday {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "holiday_pk")
    private Long id;

    @Column(name = "holiday_name", nullable = false, length = 100)
    private String holidayName;

    @Column(name = "holiday_date", nullable = false)
    private LocalDate holidayDate;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Builder
    public Holiday(String holidayName, LocalDate holidayDate) {
        this.holidayName = holidayName;
        this.holidayDate = holidayDate;
    }

    public void updateHoliday(String holidayName, LocalDate holidayDate) {
        if (holidayName != null && !holidayName.isEmpty()) {
            this.holidayName = holidayName;
        }

        if (holidayDate != null) {
            this.holidayDate = holidayDate;
        }
    }
} 