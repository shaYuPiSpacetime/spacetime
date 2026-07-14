package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** 单选字典字段保存请求。 */
@Data
public class ProfileCodeSaveReq {
    /** 字典 code。 */
    @NotBlank(message = "字典编码不能为空")
    private String code;
}
