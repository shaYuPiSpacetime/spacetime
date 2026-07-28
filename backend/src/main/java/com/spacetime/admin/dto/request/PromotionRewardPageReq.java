package com.spacetime.admin.dto.request;

import com.spacetime.common.dto.PageReq;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * 奖励流水分页请求
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class PromotionRewardPageReq extends PageReq {
    /** 来源类型 */
    private String sourceType;
    /** 奖励流水号 */
    private String rewardNo;
    /** 奖励对象关键词 */
    private String rewardObjectKeyword;
    /** 被邀请用户关键词 */
    private String inviteeKeyword;
    /** 奖励事件 */
    private String eventType;
    /** 阶梯阈值 */
    private Integer ladderThreshold;
    /** 奖励状态 */
    private String status;
    /** 生成开始时间 */
    private LocalDateTime createdStartTime;
    /** 生成结束时间 */
    private LocalDateTime createdEndTime;
}
