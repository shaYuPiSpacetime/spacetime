package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.util.List;

/**
 * 学历认证页回显信息。
 * 返回最近一次学历认证提交快照，便于驳回或失效后带出原内容再编辑提交。
 */
@Data
public class EducationVerifyDetailVO {
    private String auditStatus;
    private String auditSource;
    private String rejectReason;
    private String submitTime;
    private Boolean canSubmit;
    private String blockedReason;
    private Integer educationSlaHours;
    private String educationSlaText;
    private String educationEstimatedCompleteTime;

    private String educationUserType;
    private String educationUserTypeLabel;
    private String identityCode;
    private String identityLabel;
    private String educationMethod;
    private String educationMethodLabel;
    private String schoolName;
    private String schoolCode;
    private String educationLevel;
    private String educationLevelLabel;
    private String chsiCode;
    private String diplomaNo;
    private String certificateName;
    private List<String> materialUrls;
}
