package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 商业化配置变更审计
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_commercial_config_log")
public class CommercialConfigLog extends BaseEntity {
    /** 配置版本号 */
    private String configVersion;
    /** 变更模块 */
    private String changeModule;
    /** 变更摘要 */
    private String changeSummary;
    /** 操作人 ID */
    private Long operatorId;
    /** 操作人名称 */
    private String operatorName;
    /** 变更前 JSON */
    private String beforeSnapshot;
    /** 变更后 JSON */
    private String afterSnapshot;
}
