package com.spacetime.admin.dto.request;

import com.spacetime.common.dto.PageReq;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * 邀请关系分页请求
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class PromotionInvitePageReq extends PageReq {
    /** 关系编号 */
    private String relationNo;
    /** 邀请人ID */
    private Long inviterId;
    /** 邀请人姓名/手机号/账号 */
    private String inviterKeyword;
    /** 被邀请人ID */
    private Long inviteeId;
    /** 被邀请人姓名/手机号/账号 */
    private String inviteeKeyword;
    /** 来源类型 */
    private String sourceType;
    /** 状态 */
    private String status;
    /** 绑定开始时间 */
    private LocalDateTime bindStartTime;
    /** 绑定结束时间 */
    private LocalDateTime bindEndTime;
}
