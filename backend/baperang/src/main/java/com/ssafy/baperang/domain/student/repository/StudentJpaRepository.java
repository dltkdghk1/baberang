package com.ssafy.baperang.domain.student.repository;

import com.ssafy.baperang.domain.school.entity.School;
import com.ssafy.baperang.domain.student.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentJpaRepository extends JpaRepository<Student, Long> {
    // 기존 메소드
    @Query("SELECT s.studentName FROM Student s")
    List<String> findAllStudentNames();

    // 학교별 학생 이름 목록 조회 (추가)
    @Query("SELECT s.studentName FROM Student s WHERE s.school.id = :schoolId")
    List<String> findAllStudentNamesBySchoolId(@Param("schoolId") Long schoolId);

    // 학생 ID로 학생 찾기 (학교 정보도 함께 가져옴) (추가)
    @Query("SELECT s FROM Student s JOIN FETCH s.school WHERE s.id = :studentId")
    Optional<Student> findByIdWithSchool(@Param("studentId") Long studentId);

    // 학교별 특정 학생 조회 (ID로) (추가)
    @Query("SELECT s FROM Student s JOIN FETCH s.school WHERE s.id = :studentId AND s.school.id = :schoolId")
    Optional<Student> findByIdAndSchoolId(@Param("studentId") Long studentId, @Param("schoolId") Long schoolId);

    Optional<Student> findBySchoolAndGradeAndClassNumAndNumber(
            School school, int grade, int classNum, int number);

    List<Student> findBySchoolIdOrderByGradeAscClassNumAscNumberAsc(Long schoolId);

    // 학교별 전체 학생 수 카운트
    long countBySchool(School school);
}