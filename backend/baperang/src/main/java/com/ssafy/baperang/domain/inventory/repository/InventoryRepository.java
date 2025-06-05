package com.ssafy.baperang.domain.inventory.repository;

import com.ssafy.baperang.domain.inventory.entity.Inventory;

import java.util.List;
import java.util.Optional;

public interface InventoryRepository {

    Inventory save(Inventory inventory);
    Inventory saveAndFlush(Inventory inventory);
    Optional<Inventory> findById(Long id);
    List<Inventory> findByYearAndMonth(int year, int month);
    void deleteById(Long Id);    List<Inventory> findByProductNameAndOrderUnit(String productName, String orderUnit);
    List<Inventory> findByOrderUnit(String orderUnit);
    List<Inventory> findByYearMonthAndUnit(int year, int month, String unit);
}
