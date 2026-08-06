package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.util.List;

/** 推荐高级筛选回显。 */
@Data
public class RecommendAdvancedFilterVO {
    private Integer minHeight;
    private Integer maxHeight;
    private Integer minWeight;
    private Integer maxWeight;
    private List<String> educationCodes;
    private List<String> hometowns;
    private List<String> schoolCodes;
    /** 当前是否存在可用于精确筛选的结构化学校字典。 */
    private Boolean schoolFilterAvailable;
    private List<String> majorNames;
}
