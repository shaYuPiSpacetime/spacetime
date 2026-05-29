package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * 用户反馈实体
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_user_feedback")
public class AppUserFeedback extends BaseEntity {
    /** 用户ID */
    private Long userId;
    /** 反馈类型 */
    private String feedbackType;
    /** 反馈内容 */
    private String content;
    /** 截图URL，JSON数组 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String imageUrls;
    /** 联系方式 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String contact;
    /** 状态 @see com.spacetime.common.enums.FeedbackStatusEnum */
    private String status;
    /** 处理备注 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String handleRemark;
    /** 处理人ID */
    private Long handledBy;
    /** 处理时间 */
    private LocalDateTime handledTime;
}
