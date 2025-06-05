package com.ssafy.baperang.domain.holiday.repository;

import com.ssafy.baperang.domain.holiday.entity.Holiday;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class HolidayRepositoryImpl implements HolidayRepository {

    private final HolidayJpaRepository holidayJpaRepository;

    @Override
    public Holiday save(Holiday holiday) {
        return holidayJpaRepository.save(holiday);
    }

    @Override
    public List<Holiday> findAll() {
        return holidayJpaRepository.findAll();
    }

    @Override
    public Optional<Holiday> findById(Long id) {
        return holidayJpaRepository.findById(id);
    }

    @Override
    public List<Holiday> findByHolidayDate(LocalDate date) {
        return holidayJpaRepository.findByHolidayDate(date);
    }

    @Override
    public List<Holiday> findByHolidayDateBetween(LocalDate startDate, LocalDate endDate) {
        return holidayJpaRepository.findByHolidayDateBetween(startDate, endDate);
    }

    @Override
    public Optional<Holiday> findByHolidayDateAndHolidayName(LocalDate date, String holidayName) {
        return holidayJpaRepository.findByHolidayDateAndHolidayName(date, holidayName);
    }

    

    @Override
    public boolean existsByHolidayDateAndHolidayName(LocalDate date, String holidayName) {
        return holidayJpaRepository.existsByHolidayDateAndHolidayName(date, holidayName);
    }

    @Override
    public void deleteById(Long id) {
        holidayJpaRepository.deleteById(id);
    }
}
