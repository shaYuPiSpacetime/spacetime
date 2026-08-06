package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.util.List;

/** 理想型筛选创建时的不可变中文摘要。 */
@Data
public class IdealConditionSummaryVO {
    private List<RecommendCityVO> targetCities;
    private Integer minAge;
    private Integer maxAge;
    private List<String> conditionNames;
}
