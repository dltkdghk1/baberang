package com.ssafy.baperang.domain.menunutrient.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ssafy.baperang.domain.menu.entity.Menu;
import com.ssafy.baperang.domain.menunutrient.entity.MenuNutrient;

public interface MenuNutrientJpaRepository extends JpaRepository<MenuNutrient, MenuNutrient.MenuNutrientId> {
    MenuNutrient findByMenuIdAndNutrientId(Long menuId, Long nutrientId);
    List<MenuNutrient> findByMenuId(Long menuId);
    List<MenuNutrient> findByMenu(Menu menu);
    List<MenuNutrient> findByMenuIdIn(List<Long> menuIds);
}
