package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/** 内容/评论状态操作命令。 */
@Data
public class CommunityStatusCommandReq {
    @NotBlank private String action;
    @NotNull private Integer version;
    private String reason;
    private Boolean notifyUser;
    private String mutePeriod;
}
