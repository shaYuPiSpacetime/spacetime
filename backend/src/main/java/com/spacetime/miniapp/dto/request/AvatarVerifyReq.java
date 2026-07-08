package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 头像认证请求。
 */
@Data
public class AvatarVerifyReq {
    /** 已上传的头像媒体 ID，用于把认证记录追溯到具体上传记录。 */
    @NotNull(message = "头像媒体ID不能为空")
    private Long mediaId;
}
