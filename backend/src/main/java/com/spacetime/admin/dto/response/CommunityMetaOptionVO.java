package com.spacetime.admin.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/** 社区动态字典选项。 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CommunityMetaOptionVO {
    private String code;
    private String label;
    private String tone;
    private Boolean disabled;
    private String description;
    private Map<String, Object> extra;
}
