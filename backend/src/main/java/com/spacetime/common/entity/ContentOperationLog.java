package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 公共内容配置操作日志实体
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("content_operation_log")
public class ContentOperationLog extends BaseEntity {
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
    /** 备注 */
    private String remark;
}
