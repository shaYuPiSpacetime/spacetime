package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

/** 发起喜欢请求。 */
@Data
public class RelationLikeCreateReq {
    /** 客户端请求幂等键，同一次操作及重试必须复用。 */
    @NotBlank(message = "喜欢请求幂等键不能为空")
    private String requestId;
    /** 被喜欢用户 ID。 */
    @NotNull(message = "目标用户不能为空")
    @Positive(message = "目标用户不合法")
    private Long targetUserId;
    /** 来源场景：fate、featured、ideal、profile、likes_me、recent_viewers。 */
    @NotBlank(message = "来源场景不能为空")
    private String sourceScene;
}
