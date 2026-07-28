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
    /** 来源对象名称、编号或手机号 */
    private String sourceKeyword;
    /** 被邀请用户名称、编号或手机号 */
    private String inviteeKeyword;
    /** 来源类型 */
    private String sourceType;
    /** 注册开始时间 */
    private LocalDateTime registeredStartTime;
    /** 注册结束时间 */
    private LocalDateTime registeredEndTime;
}
