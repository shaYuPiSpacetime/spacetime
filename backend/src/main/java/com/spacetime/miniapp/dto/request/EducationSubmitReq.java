package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 学历认证提交请求
 */
@Data
public class EducationSubmitReq {
    /** 认证方式: CHSI / ONLINE_CODE / DIPLOMA_NO */
    @NotBlank(message = "认证方式不能为空")
    private String educationMethod;
    /** 学信网在线验证码 */
    private String verificationCode;
    /** 学历证书编号 */
    private String diplomaNo;
}
