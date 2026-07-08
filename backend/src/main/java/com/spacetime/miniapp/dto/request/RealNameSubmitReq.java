package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/**
 * 实名认证提交请求。
 */
@Data
public class RealNameSubmitReq {
    /** 真实姓名，按需求当前以明文入库，页面脱敏展示由业务层处理。 */
    @NotBlank(message = "真实姓名不能为空")
    private String realName;

    /** 身份证号，提交接口使用原始值，展示和导出按权限脱敏。 */
    @NotBlank(message = "身份证号不能为空")
    @Pattern(
            regexp = "^[1-9]\\d{5}(18|19|20)\\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\\d|3[01])\\d{3}[\\dXx]$",
            message = "身份证号格式不正确")
    private String idCard;

    /** 单身承诺确认；未确认时不允许提交实名。 */
    private Boolean singlePromise;
}
