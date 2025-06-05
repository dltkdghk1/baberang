package com.ssafy.baperang.domain.leftover.entity;

import com.ssafy.baperang.domain.menu.entity.Menu;
import com.ssafy.baperang.domain.student.entity.Student;
import jakarta.persistence.*;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;

@Getter
@Entity
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "leftover")
@EntityListeners(AuditingEntityListener.class)
public class Leftover {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "leftover_pk")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_pk", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "menu_pk", nullable = false)
    private Menu menu;

    @Column(name = "leftover_date", nullable = false)
    private LocalDate leftoverDate;

    @Column(name = "left_menu_name", nullable = false, columnDefinition = "TEXT")
    private String leftMenuName;

    @Column(name = "leftover_rate", nullable = false)
    private Float leftoverRate;

    @Builder
    public Leftover(Menu menu, Student student, LocalDate leftoverDate, String leftMenuName, Float leftoverRate) {
        this.menu = menu;
        this.student = student;
        this.leftoverDate = leftoverDate;
        this.leftoverRate = leftoverRate;
        this.leftMenuName = leftMenuName;
    }

}
