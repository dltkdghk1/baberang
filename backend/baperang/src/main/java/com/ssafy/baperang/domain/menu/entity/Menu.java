package com.ssafy.baperang.domain.menu.entity;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import com.ssafy.baperang.domain.menunutrient.entity.MenuNutrient;
import com.ssafy.baperang.domain.school.entity.School;
import com.ssafy.baperang.global.converter.StringListConverter;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
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
@Table(name = "menu")
@EntityListeners(AuditingEntityListener.class)
public class Menu {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "menu_pk")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "school_pk", nullable = false)
    private School school;

    @Column(name = "menu_date", nullable = false)
    private LocalDate menuDate;

    @Column(name = "menu_name", nullable = false, columnDefinition = "TEXT")
    private String menuName;

    @Column(name = "category", nullable = false)
    private String category;

    @Column(name = "amount")
    private Integer amount;

    @Column(name = "favorite")
    private Float favorite;

    @Column(name = "votes")
    private Integer votes;

    @Column(name = "alternatives", columnDefinition = "json")
    @Convert(converter = StringListConverter.class)
    private List<String> alternatives;

    // Custom getter for alternatives to ensure it's never null
    public List<String> getAlternatives() {
        return alternatives != null ? alternatives : new ArrayList<>();
    }

    @Builder
    public Menu(School school, LocalDate menuDate, String menuName, String category, 
    Integer amount, Float favorite, Integer votes, List<String> alternatives) {
        this.school = school;
        this.menuDate = menuDate;
        this.menuName = menuName;
        this.category = category;
        this.amount = amount != null ? amount : 0;
        this.favorite = favorite != null ? favorite : 0.0f;
        this.votes = votes != null ? votes : 0;
        this.alternatives = alternatives != null ? alternatives : new ArrayList<>();
    }

    // 메뉴 내용이 변경될 경우 사용
    public void updateMenuName(String menuName) {
        this.menuName = menuName;
    }

    // 선호도 변경시 사용
    public void updateFavorite(Float favorite) {
       this.favorite = favorite;
   }

    public void updateAmount(Integer amount) {this.amount = amount;}

    public void updateAlternatives(List<String> alternatives) {
        this.alternatives = alternatives != null ? alternatives : new ArrayList<>();
    }
    
    /**
     * 만족도 투표 추가 메서드
     * @param satisfactionScore 만족도 점수
     */
    public void addVote(int satisfactionScore) {
        this.votes = (this.votes != null) ? this.votes + 1 : 1;
        float currentFavorite = (this.favorite != null) ? this.favorite : 0.0f;
        this.favorite = currentFavorite + satisfactionScore;
    }
    
    /**
     * 총 투표수 반환
     * @return 투표수
     */
    public int getVoteCount() {
        return (this.votes != null) ? this.votes : 0;
    }
    
    /**
     * 총 선호도 점수 반환
     * @return 선호도 총점
     */
    public int getTotalFavorite() {
        return (this.favorite != null) ? Math.round(this.favorite) : 0;
    }
    
    /**
     * 메뉴의 영양소 정보를 Map으로 반환
     * 이 메서드는 서비스 레이어에서 MenuNutrientRepository를 주입받아 사용해야 함
     * @param menuNutrients 해당 메뉴의 영양소 정보 목록
     * @return 영양소 정보가 담긴 Map
     */
    public Map<String, Object> getNutrientInfo(List<MenuNutrient> menuNutrients) {
        // LinkedHashMap을 사용하여 삽입 순서를 유지
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("메뉴", this.menuName);
        result.put("양", this.amount);

        // 영양소 정보를 별도의 Map으로 그룹화 (LinkedHashMap으로 순서 유지)
        Map<String, Object> nutrients = new LinkedHashMap<>();
        
        // 영양소 데이터를 임시 저장
        Map<String, String> tempNutrients = new HashMap<>();
        for (MenuNutrient menuNutrient : menuNutrients) {
            String nutrientName = menuNutrient.getNutrient().getNutrientName();
            String nutrientUnit = menuNutrient.getNutrient().getUnit();
            Float amount = menuNutrient.getAmount();
            
            // 소수점 두 자리까지만 표시 (소수점이 .0으로 끝나면 정수로 표시)
            String formattedAmount;
            if (amount != null) {
                if (amount == Math.floor(amount)) {
                    formattedAmount = String.format("%.0f", amount);
                } else {
                    formattedAmount = String.format("%.2f", amount);
                }
                // 소수점 끝에 0 제거 (예: 5.20 -> 5.2)
                if (formattedAmount.contains(".")) {
                    formattedAmount = formattedAmount.replaceAll("0+$", "").replaceAll("\\.$", "");
                }
                tempNutrients.put(nutrientName, formattedAmount + nutrientUnit);
            } else {
                tempNutrients.put(nutrientName, null);
            }
        }
        
        // 지정된 순서로 영양소 추가 - 열량/에너지/칼로리를 첫 번째로
        String calorieValue = null;
        if (tempNutrients.containsKey("열량") && tempNutrients.get("열량") != null) {
            calorieValue = tempNutrients.get("열량");
            tempNutrients.remove("열량");
        } else if (tempNutrients.containsKey("에너지") && tempNutrients.get("에너지") != null) {
            calorieValue = tempNutrients.get("에너지");
            tempNutrients.remove("에너지");
        } else if (tempNutrients.containsKey("칼로리") && tempNutrients.get("칼로리") != null) {
            calorieValue = tempNutrients.get("칼로리");
            tempNutrients.remove("칼로리");
        }
        
        if (calorieValue != null) {
            nutrients.put("열량", calorieValue);
        }
        
        if (tempNutrients.containsKey("탄수화물")) {
            nutrients.put("탄수화물", tempNutrients.get("탄수화물"));
            tempNutrients.remove("탄수화물");
        }
        
        if (tempNutrients.containsKey("단백질")) {
            nutrients.put("단백질", tempNutrients.get("단백질"));
            tempNutrients.remove("단백질");
        }
        
        if (tempNutrients.containsKey("지방")) {
            nutrients.put("지방", tempNutrients.get("지방"));
            tempNutrients.remove("지방");
        }
        
        // 나머지 영양소 추가
        for (Map.Entry<String, String> entry : tempNutrients.entrySet()) {
            nutrients.put(entry.getKey(), entry.getValue());
        }
        
        // 영양소 정보를 별도 키로 추가
        result.put("영양소", nutrients);

        return result;
    }
}
