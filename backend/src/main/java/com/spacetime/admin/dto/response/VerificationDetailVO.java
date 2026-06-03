package com.spacetime.admin.dto.response;

import lombok.Data;

/**
 * 管理后台 — 用户认证详情视图
 * 包含实名、学历、头像认证及内容审核的全部状态
 */
@Data
public class VerificationDetailVO {
    /** 实名认证状态 */
    private String realNameStatus;
    /** 实名认证驳回原因 */
    private String realNameRejectReason;
    /** 实名认证提交时间 */
    private String realNameSubmitTime;
    /** 学历认证状态 */
    private String educationStatus;
    /** 学历认证方式 */
    private String educationMethod;
    /** 学历认证驳回原因 */
    private String educationRejectReason;
    /** 学历认证提交时间 */
    private String educationSubmitTime;
    /** 头像认证状态 */
    private String avatarVerifyStatus;
    /** 头像认证驳回原因 */
    private String avatarVerifyRejectReason;
    /** 头像认证提交时间 */
    private String avatarVerifySubmitTime;
    /** 照片审核状态 */
    private String profilePhotoAuditStatus;
    /** 照片审核驳回原因 */
    private String profilePhotoRejectReason;
    /** 文字审核状态 */
    private String openTextAuditStatus;
    /** 文字审核驳回原因 */
    private String openTextRejectReason;
    /** 认证等级 0-3 */
    private Integer verifyLevel;
}
