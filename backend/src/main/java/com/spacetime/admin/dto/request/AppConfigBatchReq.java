package com.spacetime.admin.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

/**
 * 应用配置批量保存请求
 */
@Data
public class AppConfigBatchReq {
    /** 配置项列表 */
    @NotNull(message = "配置项列表不能为空")
    @Size(min = 1, message = "至少包含一个配置项")
    @Valid
    private List<AppConfigItem> items;

    /**
     * 单个配置项
     */
    @Data
    public static class AppConfigItem {
        /** 配置键 */
        @NotBlank(message = "配置键不能为空")
        private String configKey;
        /** 配置值 */
        private String configValue;
        /** 配置分组 */
        @NotBlank(message = "配置分组不能为空")
        private String configGroup;
        /** 配置类型 */
        @NotBlank(message = "配置类型不能为空")
        private String configType;
        /** 是否允许小程序公共接口返回：0=否，1=是 */
        @NotNull(message = "publicVisible 不能为空")
        private Integer publicVisible;
        /** 状态 */
        @NotBlank(message = "状态不能为空")
        private String status;
        /** 备注 */
        private String remark;
    }
}
