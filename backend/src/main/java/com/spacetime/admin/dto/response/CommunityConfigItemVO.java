package com.spacetime.admin.dto.response;

import lombok.Data;

/** 社区配置项。 */
@Data
public class CommunityConfigItemVO {
    private String configKey;
    private Object configValue;
    private String sectionCode;
    private String configGroup;
    private String name;
    private String description;
    private String configType;
    private Boolean highRisk;
    private Boolean editable;
    private String optionsKey;
    private Integer sort;
}
