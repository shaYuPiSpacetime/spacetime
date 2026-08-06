package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/** 推荐与理想型共享筛选偏好。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ct_recommend_preference")
public class RecommendPreference extends BaseEntity {
    private Long userId;
    private String targetCityCodes;
    private Integer allowNeighborCity;
    private Integer minAge;
    private Integer maxAge;
    private Integer minHeight;
    private Integer maxHeight;
    private Integer minWeight;
    private Integer maxWeight;
    private String educationCodes;
    private String hometowns;
    private String schoolCodes;
    private String majorNames;
    private Integer version;
}
