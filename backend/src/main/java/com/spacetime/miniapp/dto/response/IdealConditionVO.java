package com.spacetime.miniapp.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** 固定理想型条件及当前用户可用性。 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class IdealConditionVO {
    private String code;
    private String category;
    private String name;
    private Boolean available;
    private String disabledReason;
}
