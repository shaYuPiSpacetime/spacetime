package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 强引导自我介绍提交请求。
 */
@Data
public class IntroductionSubmitReq {
    /** 关于我正文，正式需求固定为 20-300 字。 */
    @NotBlank(message = "自我介绍不能为空")
    @Size(min = 20, max = 300, message = "自我介绍需20-300个字")
    private String aboutMe;
}
