package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * 用户注销申请实体
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_user_cancel_request")
public class AppUserCancelRequest extends BaseEntity {
    /** 用户ID */
    private Long userId;
    /** 注销状态 @see com.spacetime.common.enums.CancelRequestStatusEnum */
    private String status;
    /** 注销原因 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String reason;
    /** 阻断原因 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String blockReason;
    /** 后台备注 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String remark;
    /** 后悔期结束时间 */
    private LocalDateTime coolingEndTime;
    /** 撤销时间 */
    private LocalDateTime revokedTime;
    /** 最终注销时间 */
    private LocalDateTime finalCancelTime;
}
