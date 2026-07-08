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
    /** 绑定手机号，列表按脱敏值展示 */
    private String phone;
    /** 真实姓名，列表按脱敏值展示 */
    private String realName;
    /** 身份证号，列表按脱敏值展示 */
    private String idCard;
    /** 学历身份/学校摘要 */
    private String educationIdentity;
    /** 学历材料摘要 */
    private String educationMaterialSummary;
    /** 头像审核图片 URL */
    private String avatarUrl;
    /** 认证状态 @see VerificationStatusEnum */
    private String status;
    /** 审核来源：MACHINE/MANUAL */
    private String auditSource;
    /** 驳回原因 */
    private String rejectReason;
    /** 提交时间 */
    private String submitTime;
    /** 审核结果时间 */
    private String resultTime;
}
