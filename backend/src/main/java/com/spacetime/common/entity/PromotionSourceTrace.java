package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 推广来源追踪表
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("promotion_source_trace")
public class PromotionSourceTrace extends BaseEntity {
    /** 来源追踪号 */
    private String traceNo;
    /** 来源类型 */
    private String sourceType;
    /** 普通邀请人ID */
    private Long inviterId;
    /** 普通邀请码 */
    private String inviteCode;
    /** 代理ID */
    private Long agentId;
    /** 校园代理二维码编号 */
    private String qrCode;
    /** 已登录用户ID */
    private Long visitorUserId;
    /** 注册后绑定用户ID */
    private Long inviteeUserId;
    /** 小程序 scene */
    private String scene;
    /** 设备指纹 */
    private String deviceHash;
    /** IP */
    private String ip;
    /** 绑定状态 */
    private String bindStatus;
}
