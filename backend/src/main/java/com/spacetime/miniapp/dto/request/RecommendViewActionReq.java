package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** 推荐候选浏览动作请求。 */
@Data
public class RecommendViewActionReq {
    @NotBlank(message = "请求幂等键不能为空")
    private String requestId;
    private Integer filterVersion;
    private Integer position;
}
