package com.ssafy.baperang.domain.student.entity;

import java.time.LocalDate;

import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import com.ssafy.baperang.domain.school.entity.School;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;


@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "student")
@EntityListeners(AuditingEntityListener.class)
public class Student {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "student_pk")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "school_pk", nullable = false)
    private School school;

    @Column(name = "student_name", nullable = false, length = 10)
    private String studentName;

    @Column(name = "gender", nullable = false, length = 10)
    private String gender;

    @Column(name = "grade", nullable = false)
    private Integer grade;

    @Column(name = "class", nullable = false)
    private Integer classNum;

    @Column(name = "number", nullable = false)
    private Integer number;

    @Column(name = "height", nullable = false)
    private Float height;

    @Column(name = "weight", nullable = false)
    private Float weight;

    @Column(name = "image", columnDefinition = "TEXT")
    private String image;

    @Column(name = "image_date")
    private LocalDate imageDate;

    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @Column(name = "content_date")
    private LocalDate contentDate;



    @Builder
    public Student(String studentName, String gender, Integer grade, Integer classNum,
                   Float height, Float weight, School school, Integer number, LocalDate imageDate,
                   String content, String image, LocalDate contentDate) {
        this.studentName = studentName;
        this.gender = gender;
        this.classNum = classNum;
        this.grade = grade;
        this.height = height;
        this.weight = weight;
        this.school = school;
        this.number = number;
        this.content = content;
        this.contentDate = contentDate;
        this.image = image;
        this.imageDate = imageDate;
    }

    public static Student updateImage(Student original, String imageUrl) {
        return Student.builder()
                .studentName(original.getStudentName())
                .gender(original.getGender())
                .grade(original.getGrade())
                .classNum(original.getClassNum())
                .height(original.getHeight())
                .weight(original.getWeight())
                .school(original.getSchool())
                .number(original.getNumber())
                .image(imageUrl)
                .imageDate(LocalDate.now())
                .content(original.getContent())
                .contentDate(original.getContentDate())
                .build();
    }

    public void updateImageDirectly(String imageUrl) {
        this.image = imageUrl;
        this.imageDate = LocalDate.now();
    }

    public void updateContent(String content, LocalDate contentDate) {
        this.content = content;
        this.contentDate = contentDate;
    }
}
