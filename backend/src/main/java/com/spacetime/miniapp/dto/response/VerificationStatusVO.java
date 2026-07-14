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
    /** 实名是否允许提交或驳回后重提。 */
    private Boolean realNameCanSubmit;

    /** 学历认证状态。 */
    private String educationStatus;
    /** 学历认证驳回原因。 */
    private String educationRejectReason;
    /** 学历认证提交时间，格式 yyyy-MM-dd HH:mm:ss。 */
    private String educationSubmitTime;
    /** 学历当前是否满足实名前置且允许提交。 */
    private Boolean educationCanSubmit;
    /** 学历不可提交时的顺序或审核阻断原因。 */
    private String educationBlockedReason;
    /** 学历审核承诺时长，读取准入与认证配置。 */
    private Integer educationSlaHours;
    /** 学历审核时长展示文案。 */
    private String educationSlaText;
    /** 待审核/审核中记录的预计完成时间，格式 yyyy-MM-dd HH:mm:ss。 */
    private String educationEstimatedCompleteTime;

    /** 头像认证状态。 */
    private String avatarVerifyStatus;
    /** 头像认证驳回原因。 */
    private String avatarVerifyRejectReason;
    /** 头像认证提交时间，格式 yyyy-MM-dd HH:mm:ss。 */
    private String avatarVerifySubmitTime;
    /** 头像是否允许提交或更换。 */
    private Boolean avatarCanSubmit;

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
    /** 准入能力详情，与登录和资料详情接口同口径。 */
    private AccessStatusVO accessStatus;
}
