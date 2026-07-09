package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * App 用户统一审核记录。
 * 一条记录代表一次提交，不再按实名、学历、图片、文字、语音拆多张审核表。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_user_audit_record")
public class AppUserAuditRecord extends BaseEntity {
    private Long userId;
    private String auditGroup;
    private String auditType;
    private Long objectId;
    private String objectKey;
    private String status;
    private String auditSource;
    private Integer currentEffective;
    private Long providerTaskId;

    private String mediaUrl;
    private String thumbUrl;
    private Integer duration;
    private String contentText;
    private String contentHash;

    private String realName;
    private String realNameHash;
    private String idCard;
    private String idCardHash;
    private String boundPhone;
    private String educationMethod;
    private String schoolName;
    private String educationLevel;

    private String submitPayloadJson;
    private String maskedPayloadJson;
    private String materialJson;
    private String machineSignalJson;
    private String rejectReason;
    private String expiredReason;
    private LocalDateTime submitTime;
    private LocalDateTime auditTime;
    private Long auditorId;
    private String extraJson;
}
