package com.spacetime.admin.dto.request;

import com.spacetime.common.dto.PageReq;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 邀请关系分页请求
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class PromotionInvitePageReq extends PageReq {
    /** 邀请人ID */
    private Long inviterId;
    /** 被邀请人ID */
    private Long inviteeId;
    /** 来源类型 */
    private String sourceType;
    /** 状态 */
    private String status;
}
