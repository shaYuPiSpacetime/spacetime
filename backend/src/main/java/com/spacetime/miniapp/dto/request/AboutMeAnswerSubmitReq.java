package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** 关于我开放问题提交请求。 */
@Data
public class AboutMeAnswerSubmitReq {
    /** 固定问题 key，例如 interests、idealWeekend、loveView。 */
    @NotBlank(message = "问题不能为空")
    private String questionKey;
    /** 回答内容，进入开放性文字审核。 */
    @NotBlank(message = "回答内容不能为空")
    private String contentText;
}
