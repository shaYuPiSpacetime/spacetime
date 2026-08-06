package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.util.List;

/** 理想型筛选页元数据。 */
@Data
public class IdealMetaVO {
    private Integer preferenceVersion;
    private List<RecommendCityVO> targetCities;
    private Integer minAge;
    private Integer maxAge;
    private List<IdealConditionVO> conditions;
    private List<String> lastConditionCodes;
    private Long historyCount;
    private Boolean overseasAddressAvailable;
    private String overseasAddressDisabledReason;
}
