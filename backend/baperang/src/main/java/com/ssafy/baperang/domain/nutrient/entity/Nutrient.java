package com.ssafy.baperang.domain.nutrient.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "nutrient")
@EntityListeners(AuditingEntityListener.class)
public class Nutrient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "nutrient_pk")
    private Long id;

    @Column(name = "nutrient_name", nullable = false)
    private String nutrientName;

    @Column(name = "unit", nullable = false)
    private String unit;

    @Builder
    public Nutrient(String nutrientName, String unit) {
        this.nutrientName = nutrientName;
        this.unit = unit;
    }
}
