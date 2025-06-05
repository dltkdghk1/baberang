package com.ssafy.baperang.domain.student.repository;

import com.ssafy.baperang.domain.school.entity.School;
import com.ssafy.baperang.domain.student.entity.Student;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class StudentRepositoryImpl implements StudentRepository {

    private final StudentJpaRepository studentJpaRepository;

    @Override
    public Optional<Student> findById(Long studentId) {
        return studentJpaRepository.findById(studentId);
    }

    @Override
    public Student save(Student student) {
        return studentJpaRepository.save(student);
    }

    @Override
    public Student saveAndFlush(Student student) {
        return studentJpaRepository.saveAndFlush(student);
    }

    @Override
    public List<String> findAllStudentNamesBySchoolId(Long schoolId) {
        return studentJpaRepository.findAllStudentNamesBySchoolId(schoolId);
    }

    @Override
    public Optional<Student> findByIdWithSchool(Long studentId) {
        return studentJpaRepository.findByIdWithSchool(studentId);
    }

    @Override
    public Optional<Student> findByIdAndSchoolId(Long studentId, Long schoolId) {
        return studentJpaRepository.findByIdAndSchoolId(studentId, schoolId);
    }

    @Override
    public Optional<Student> findBySchoolAndGradeAndClassNumAndNumber(School school, int grade, int classNum, int number) {
        return studentJpaRepository.findBySchoolAndGradeAndClassNumAndNumber(school, grade, classNum, number);
    }

    @Override
    public List<Student> findBySchoolIdOrderByGradeAscClassNumAscNumberAsc(Long schoolId) {
        return studentJpaRepository.findBySchoolIdOrderByGradeAscClassNumAscNumberAsc(schoolId);
    }

    @Override
    public long countBySchool(School school) {
        return studentJpaRepository.countBySchool(school);
    }
}