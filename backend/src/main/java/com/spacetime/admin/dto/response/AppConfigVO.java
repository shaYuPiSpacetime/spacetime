package com.spacetime.admin.dto.response;

import lombok.Data;

/**
 * 应用配置视图对象
 */
@Data
public class AppConfigVO {
    /** 主键 ID */
    private Long id;
    /** 配置键 */
    private String configKey;
    /** 配置值 */
    private String configValue;
    /** 配置分组 */
    private String configGroup;
    /** 配置类型 */
    private String configType;
    /** 是否允许小程序公共接口返回：0=否，1=是 */
    private Integer publicVisible;
    /** 状态 */
    private String status;
    /** 备注 */
    private String remark;
    /** 更新时间 */
    private String updateTime;
}
