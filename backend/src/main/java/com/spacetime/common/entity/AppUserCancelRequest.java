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
    /** 注销申请编号 */
    private String requestNo;
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
    /** 硬阻断快照 JSON */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String hardBlockSnapshot;
    /** 可确认风险快照 JSON */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String riskSnapshot;
    /** 会员权益快照 JSON */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String vipSnapshot;
    /** 申请时千寻币余额 */
    private Integer coinBalance;
    /** 退款快照 JSON */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String refundSnapshot;
    /** 争议快照 JSON */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String disputeSnapshot;
    /** 处罚快照 JSON */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String penaltySnapshot;
    /** 定时任务执行日志 JSON */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String executionLog;
    /** 失败后的下次重试时间 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private LocalDateTime nextRetryTime;
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
