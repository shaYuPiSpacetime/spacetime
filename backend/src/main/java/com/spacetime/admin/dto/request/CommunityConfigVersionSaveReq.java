package com.spacetime.admin.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

/** 社区配置版本保存请求。 */
@Data
public class CommunityConfigVersionSaveReq {
    @NotNull private Integer version;
    @NotEmpty @Valid private List<Item> items;
    private String changeSummary;
    private Boolean highRiskConfirmed;

    @Data
    public static class Item {
        @NotNull private String configKey;
        private Object configValue;
        private String configGroup;
        private String configType;
        private String sectionCode;
        private String name;
        private String description;
        private Boolean highRisk;
        private Boolean editable;
        private String optionsKey;
        private Integer sort;
    }
}
