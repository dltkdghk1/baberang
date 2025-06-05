package com.ssafy.baperang.domain.student.repository;

import com.ssafy.baperang.domain.school.entity.School;
import com.ssafy.baperang.domain.student.entity.Student;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentRepository {
    // 기본 CRUD 작업
    Optional<Student> findById(Long studentId);
    Student save(Student student);
    Student saveAndFlush(Student student);

    // 커스텀 쿼리 메서드
    List<String> findAllStudentNamesBySchoolId(Long schoolId);
    Optional<Student> findByIdWithSchool(Long studentId);
    Optional<Student> findByIdAndSchoolId(Long studentId, Long schoolId);
    Optional<Student> findBySchoolAndGradeAndClassNumAndNumber(
            School school, int grade, int classNum, int number);
    List<Student> findBySchoolIdOrderByGradeAscClassNumAscNumberAsc(Long schoolId);

    // 학교별 전체 학생 수 카운트
    long countBySchool(com.ssafy.baperang.domain.school.entity.School school);
}