package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class MiniappRelationBlockReq {
    @NotNull(message = "目标用户不能为空")
    private Long targetUserId;
    private String sourceScene;
}
