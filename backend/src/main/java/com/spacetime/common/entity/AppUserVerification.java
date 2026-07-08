package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * 用户认证与审核状态表（每用户一条记录）
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_user_verification")
public class AppUserVerification extends BaseEntity {
    /** 用户ID */
    private Long userId;

    /** 实名认证状态 @see VerificationStatusEnum */
    private String realNameStatus;
    /** 真实姓名明文；展示和导出脱敏由业务层按权限处理 */
    private String realName;
    /** 身份证号明文；展示和导出脱敏由业务层按权限处理 */
    private String idCard;
    /** 实名绑定手机号明文 */
    private String boundPhone;
    /** 真实姓名 hash */
    private String realNameHash;
    /** 身份证号 hash */
    private String idCardHash;
    /** 实名认证提交时间 */
    private LocalDateTime realNameSubmitTime;
    /** 实名认证结果时间 */
    private LocalDateTime realNameResultTime;
    /** 实名驳回原因 */
    private String realNameRejectReason;
    /** 实名审核来源：MACHINE/MANUAL */
    private String realNameAuditSource;
    /** 实名 Provider 任务 ID */
    private Long realNameProviderTaskId;

    /** 学历认证状态 @see VerificationStatusEnum */
    private String educationStatus;
    /** 认证方式: CHSI/ONLINE_CODE/DIPLOMA_NO */
    private String educationMethod;
    /** 学历认证提交时间 */
    private LocalDateTime educationSubmitTime;
    /** 学历认证结果时间 */
    private LocalDateTime educationResultTime;
    /** 学历驳回原因 */
    private String educationRejectReason;
    /** 学历审核来源：MACHINE/MANUAL */
    private String educationAuditSource;
    /** 学历 Provider 任务 ID */
    private Long educationProviderTaskId;

    /** 头像认证状态 @see VerificationStatusEnum */
    private String avatarVerifyStatus;
    /** 头像认证提交时间 */
    private LocalDateTime avatarVerifySubmitTime;
    /** 头像认证结果时间 */
    private LocalDateTime avatarVerifyResultTime;
    /** 头像驳回原因 */
    private String avatarVerifyRejectReason;
    /** 头像审核来源：MACHINE/MANUAL */
    private String avatarAuditSource;
    /** 头像 Provider 任务 ID */
    private Long avatarProviderTaskId;

    /** 资料照片审核状态 @see ModerationStatusEnum */
    private String profilePhotoAuditStatus;
    /** 照片审核提交时间 */
    private LocalDateTime profilePhotoSubmitTime;
    /** 照片驳回原因 */
    private String profilePhotoRejectReason;
    /** 资料照片审核来源：MACHINE/MANUAL */
    private String profilePhotoAuditSource;

    /** 文字审核状态 @see ModerationStatusEnum */
    private String openTextAuditStatus;
    /** 文字审核提交时间 */
    private LocalDateTime openTextSubmitTime;
    /** 文字驳回原因 */
    private String openTextRejectReason;
    /** 文字审核来源：MACHINE/MANUAL */
    private String openTextAuditSource;

    /** 已完成认证数量 0-3 */
    private Integer verifyLevel;
    /** 核心准入状态 */
    private String coreAccessStatus;
    /** 核心准入阻断原因 */
    private String coreAccessReason;
}
