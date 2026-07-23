package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

/** 婚恋用户主页访问上报请求。 */
@Data
public class RelationVisitCreateReq {
    /** 单次主页进入事件幂等编号。 */
    @NotBlank(message = "访问事件编号不能为空")
    private String eventNo;
    /** 被访问用户 ID。 */
    @NotNull(message = "目标用户不能为空")
    @Positive(message = "目标用户不合法")
    private Long targetUserId;
    /** 实际进入主页的来源场景。 */
    @NotBlank(message = "来源场景不能为空")
    private String sourceScene;
}
