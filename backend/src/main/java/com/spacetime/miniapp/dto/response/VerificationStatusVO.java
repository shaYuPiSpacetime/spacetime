package com.spacetime.miniapp.dto.response;

import lombok.Data;

/**
 * 认证中心状态响应
 */
@Data
public class VerificationStatusVO {
    /** 实名认证状态 @see com.spacetime.common.enums.VerificationStatusEnum */
    private String realNameStatus;
    /** 实名认证驳回原因 */
    private String realNameRejectReason;
    /** 学历认证状态 @see com.spacetime.common.enums.VerificationStatusEnum */
    private String educationStatus;
    /** 学历认证驳回原因 */
    private String educationRejectReason;
    /** 头像认证状态 @see com.spacetime.common.enums.VerificationStatusEnum */
    private String avatarVerifyStatus;
    /** 头像认证驳回原因 */
    private String avatarVerifyRejectReason;
    /** 照片审核状态 */
    private String profilePhotoAuditStatus;
    /** 文字审核状态 */
    private String openTextAuditStatus;
    /** 认证等级 0-3（实名+学历+头像通过数） */
    private Integer verifyLevel;
    /** 是否解锁配对推荐（实名通过即可） */
    private Boolean unlockMateRecommend;
}
