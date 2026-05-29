package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class MiniappKeywordBlockReq {
    @NotBlank(message = "关键词不能为空")
    private String keyword;
}
