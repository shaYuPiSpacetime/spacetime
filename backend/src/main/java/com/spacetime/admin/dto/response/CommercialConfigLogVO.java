package com.spacetime.admin.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 商业化配置变更审计响应
 */
@Data
public class CommercialConfigLogVO {
    /** 主键 ID */
    private Long id;
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
    /** 创建时间 */
    private LocalDateTime createTime;
}
