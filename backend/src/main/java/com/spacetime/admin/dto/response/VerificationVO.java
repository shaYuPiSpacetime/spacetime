package com.spacetime.admin.dto.response;

import lombok.Data;

/**
 * 管理后台 — 认证审核列表行视图
 */
@Data
public class VerificationVO {
    /** 认证记录ID */
    private Long id;
    /** 用户ID */
    private Long userId;
    /** 用户头像URL */
    private String avatar;
    /** 用户昵称 */
    private String nickname;
    /** 认证状态 @see VerificationStatusEnum */
    private String status;
    /** 驳回原因 */
    private String rejectReason;
    /** 提交时间 */
    private String submitTime;
    /** 审核结果时间 */
    private String resultTime;
}
