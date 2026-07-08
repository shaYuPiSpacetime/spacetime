package com.spacetime.miniapp.dto.response;

import lombok.Data;

/**
 * 移动端三重认证状态。
 */
@Data
public class VerificationStatusVO {
    /** 实名认证状态。 */
    private String realNameStatus;
    /** 实名认证驳回原因。 */
    private String realNameRejectReason;
    /** 实名认证提交时间，格式 yyyy-MM-dd HH:mm:ss。 */
    private String realNameSubmitTime;

    /** 学历认证状态。 */
    private String educationStatus;
    /** 学历认证驳回原因。 */
    private String educationRejectReason;
    /** 学历认证提交时间，格式 yyyy-MM-dd HH:mm:ss。 */
    private String educationSubmitTime;

    /** 头像认证状态。 */
    private String avatarVerifyStatus;
    /** 头像认证驳回原因。 */
    private String avatarVerifyRejectReason;
    /** 头像认证提交时间，格式 yyyy-MM-dd HH:mm:ss。 */
    private String avatarVerifySubmitTime;

    /** 资料图片审核状态。 */
    private String profilePhotoAuditStatus;
    /** 开放性文字审核状态。 */
    private String openTextAuditStatus;
    /** 三重认证通过数量，范围 0-3。 */
    private Integer verifyLevel;
    /** 是否解锁配对推荐。 */
    private Boolean unlockMateRecommend;
    /** 核心准入状态：CORE_ALLOWED、CORE_BLOCKED、NON_CORE_ONLY。 */
    private String coreAccessStatus;
}
