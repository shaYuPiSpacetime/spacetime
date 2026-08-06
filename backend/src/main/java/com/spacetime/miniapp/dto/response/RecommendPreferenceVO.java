package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.util.List;

/** 推荐与理想型共享偏好响应。 */
@Data
public class RecommendPreferenceVO {
    private Integer version;
    private List<RecommendCityVO> targetCities;
    private Boolean allowNeighborCity;
    private Boolean neighborCityAvailable;
    private String neighborCityDisabledReason;
    private Integer minAge;
    private Integer maxAge;
    private RecommendAdvancedFilterVO advanced;
    private Boolean vipEffective;
    private Integer advancedEffectiveCount;
    private Boolean defaulted;
}
