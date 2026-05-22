package com.spacetime.admin.dto.request;

import com.spacetime.common.dto.PageReq;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 奖励流水分页请求
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class PromotionRewardPageReq extends PageReq {
    /** 邀请人ID */
    private Long inviterId;
    /** 被邀请人ID */
    private Long inviteeId;
    /** 奖励事件 */
    private String eventType;
    /** 奖励状态 */
    private String status;
}
