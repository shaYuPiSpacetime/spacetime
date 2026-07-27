package com.spacetime.miniapp.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** 悦目心动切换结果。 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class YuemuLikeToggleVO {
    /** 最终心动态。 */
    private Boolean liked;
}
