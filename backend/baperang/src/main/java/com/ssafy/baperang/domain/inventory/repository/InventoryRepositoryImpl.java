package com.ssafy.baperang.domain.inventory.repository;

import com.ssafy.baperang.domain.inventory.entity.Inventory;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class InventoryRepositoryImpl implements InventoryRepository{

    private final InventoryJpaRepository inventoryJpaRepository;

    @Override
    public Inventory save(Inventory inventory) {
        return inventoryJpaRepository.save(inventory);
    }

    @Override
    public Inventory saveAndFlush(Inventory inventory) {
        return inventoryJpaRepository.saveAndFlush(inventory);
    }

    @Override
    public Optional<Inventory> findById(Long id) {
        return inventoryJpaRepository.findById(id);
    }

    @Override
    public List<Inventory> findByYearAndMonth(int year, int month) {
        return inventoryJpaRepository.findByMonth(year, month);
    }

    @Override
    public void deleteById(Long id) {
        inventoryJpaRepository.deleteById(id);
    }

    @Override
    public List<Inventory> findByProductNameAndOrderUnit(String productName, String orderUnit) {
        return inventoryJpaRepository.findByProductNameAndOrderUnit(productName, orderUnit);
    }

    @Override
    public List<Inventory> findByOrderUnit(String orderUnit) {
        return inventoryJpaRepository.findByOrderUnit(orderUnit);
    }

    @Override
    public List<Inventory> findByYearMonthAndUnit(int year, int month, String unit) {
        return inventoryJpaRepository.findByMonthAndUnit(year, month, unit);
    }

}
