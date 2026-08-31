package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

/**
 * 学历认证提交请求。
 */
@Data
public class EducationSubmitReq {
    /** 学历人群：STUDENT（在校生）、MAINLAND_GRADUATE（中国大陆毕业生）。 */
    @NotBlank(message = "学历人群不能为空")
    private String educationUserType;

    /** 认证方式：STUDENT_CARD、CHSI、DIPLOMA_NO、MATERIAL_UPLOAD。 */
    @NotBlank(message = "认证方式不能为空")
    private String educationMethod;

    /** 学校名称。 */
    @NotBlank(message = "学校名称不能为空")
    private String schoolName;

    /** 学校字典稳定编码；港澳台、海外或手动填写时可不传。 */
    private String schoolCode;

    /** 学历字典 code，必须命中 app_education_level。 */
    @NotBlank(message = "学历不能为空")
    private String educationLevel;

    /** 学信网在线验证码，CHSI 方式必填，长度 12-18 位。 */
    private String chsiCode;

    /** 毕业证或学位证书编号，DIPLOMA_NO 方式必填。 */
    private String diplomaNo;

    /** 证书姓名，证书编号或上传证书方式必填。 */
    private String certificateName;

    /** 学生证、在读证明、毕业证或学位证的公网 URL，最多 4 张。 */
    private List<String> materialUrls;

    /** 学历认证协议勾选，必须为 true。 */
    private Boolean educationAgreementChecked;
}
