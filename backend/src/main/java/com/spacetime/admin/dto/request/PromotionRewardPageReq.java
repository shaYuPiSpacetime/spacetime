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
    /** 奖励流水号 */
    private String rewardNo;
    /** 邀请人ID */
    private Long inviterId;
    /** 邀请人姓名/手机号/账号 */
    private String inviterKeyword;
    /** 被邀请人ID */
    private Long inviteeId;
    /** 被邀请人姓名/手机号/账号 */
    private String inviteeKeyword;
    /** 奖励事件 */
    private String eventType;
    /** 奖励状态 */
    private String status;
    /** 创建开始时间 */
    private LocalDateTime startTime;
    /** 创建结束时间 */
    private LocalDateTime endTime;
}
