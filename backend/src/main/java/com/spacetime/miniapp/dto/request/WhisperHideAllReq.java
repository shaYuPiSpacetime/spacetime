package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** 接收方按页面分组逻辑隐藏悄悄话。 */
@Data
public class WhisperHideAllReq {
    @NotBlank(message = "分组不能为空")
    private String bucket;
}
