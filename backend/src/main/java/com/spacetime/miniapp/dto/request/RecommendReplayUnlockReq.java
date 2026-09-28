package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** 三天回放单人主页确认解锁。 */
@Data
public class RecommendReplayUnlockReq {
    @NotBlank(message = "请求编号不能为空")
    @Size(max = 100, message = "请求编号过长")
    private String requestId;
    @NotNull(message = "确认价格不能为空")
    @Min(value = 0, message = "确认价格不合法")
    private Integer expectedPrice;
}
