package com.spacetime.miniapp.dto.response;

import lombok.Data;

/**
 * 实名认证页回显信息。
 * 移动端本人页只返回脱敏后的姓名和身份证号，不返回明文手机号。
 */
@Data
public class RealNameVerifyDetailVO {
    private String realName;
    private String idCardNo;
    private String auditStatus;
    private String auditSource;
    private String rejectReason;
    private String submitTime;
    private Boolean canSubmit;
}
