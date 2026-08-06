package com.spacetime.miniapp.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** 推荐目标城市展示项。 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RecommendCityVO {
    private String code;
    private String name;
}
