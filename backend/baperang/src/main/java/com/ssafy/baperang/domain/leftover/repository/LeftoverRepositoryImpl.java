package com.ssafy.baperang.domain.leftover.repository;

import com.ssafy.baperang.domain.leftover.dto.response.LeftoverDateResponseDto;
import com.ssafy.baperang.domain.leftover.entity.Leftover;
import com.ssafy.baperang.domain.menu.entity.Menu;
import com.ssafy.baperang.domain.student.entity.Student;
import com.ssafy.baperang.domain.school.entity.School;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class LeftoverRepositoryImpl implements LeftoverRepository {

    private final LeftoverJpaRepository leftoverJpaRepository;

    @Override
    public Leftover save(Leftover leftover) {
        return leftoverJpaRepository.save(leftover);
    }

    @Override
    public List<LeftoverDateResponseDto.MenuLeftoverRate> findAverageLeftoverRateByDate(LocalDate date) {
        return leftoverJpaRepository.findAverageLeftoverRateByDate(date);
    }

    @Override
    public List<Leftover> findByYearAndMonth(int year, int month) {
        return leftoverJpaRepository.findByYearAndMonth(year, month);
    }

    @Override
    public List<Leftover> findByStudentAndLeftoverDate(Student student, LocalDate leftoverDate) {
        return leftoverJpaRepository.findByStudentAndLeftoverDate(student, leftoverDate);
    }

    @Override
    public Optional<Leftover> findByStudentAndMenuAndLeftoverDate(Student student, Menu menu, LocalDate leftoverDate) {
        return leftoverJpaRepository.findByStudentAndMenuAndLeftoverDate(student, menu, leftoverDate);
    }

    @Override
    public List<Leftover> findByStudentAndLeftoverDateBetween(Student student, LocalDate startDate, LocalDate endDate) {
        return leftoverJpaRepository.findByStudentAndLeftoverDateBetween(student, startDate, endDate);
    }

    @Override
    public List<Leftover> findByStudentAndLeftoverDateIn(Student student, Collection<LocalDate> dates) {
        return leftoverJpaRepository.findByStudentAndLeftoverDateIn(student, dates);
    }

    @Override
    public long countDistinctStudentByDateAndSchool(LocalDate date, School school) {
        return leftoverJpaRepository.countDistinctStudentByDateAndSchool(date, school);
    }
}