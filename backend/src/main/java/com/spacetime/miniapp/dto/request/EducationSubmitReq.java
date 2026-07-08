package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

/**
 * 学历认证提交请求。
 */
@Data
public class EducationSubmitReq {
    /** 认证方式：CHSI、ONLINE_CODE、DIPLOMA_NO、MATERIAL_UPLOAD。 */
    @NotBlank(message = "认证方式不能为空")
    private String educationMethod;

    /** 学校名称，用于学历认证表单回显和后续人工核验。 */
    private String school;

    /** 学籍状态，例如在校、已毕业等产品约定值。 */
    private String studentStatus;

    /** 学信网在线验证码。 */
    private String verificationCode;

    /** 毕业证书编号。 */
    private String diplomaNo;

    /** 学历材料上传后的媒体 ID 列表。 */
    private List<Long> materialIds;
}
