package com.spacetime.admin.dto.response;

import lombok.Data;

/**
 * 内容操作日志视图对象
 */
@Data
public class ContentOperationLogVO {
    /** 主键 ID */
    private Long id;
    /** 业务类型 */
    private String bizType;
    /** 业务主键 */
    private Long bizId;
    /** 动作 */
    private String action;
    /** 变更前摘要 JSON */
    private String beforeValue;
    /** 变更后摘要 JSON */
    private String afterValue;
    /** 操作人名称 */
    private String operatorName;
    /** 备注 */
    private String remark;
    /** 创建时间 */
    private String createTime;
}
