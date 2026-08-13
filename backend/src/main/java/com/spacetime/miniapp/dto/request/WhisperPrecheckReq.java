package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/** 悄悄话发送预检查请求。 */
@Data
public class WhisperPrecheckReq {
    /** 接收方稳定编号，格式为 USR- 加 12 位数字。 */
    @NotBlank(message = "目标用户编号不能为空")
    @Pattern(regexp = "^USR-\\d{12}$", message = "目标用户编号格式不正确")
    private String targetUserNo;

    /** 来源场景：推荐、主页、社区动态、社区评论或反向申请。 */
    @NotBlank(message = "来源场景不能为空")
    private String sourceScene;

    /** 来源业务编号；社区和反向申请场景必填。 */
    private String sourceBizNo;
}
