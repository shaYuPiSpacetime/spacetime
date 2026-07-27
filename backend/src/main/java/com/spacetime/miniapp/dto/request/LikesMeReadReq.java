package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** 喜欢我的快照已读请求。 */
@Data
public class LikesMeReadReq {
    @NotBlank(message = "读取游标不能为空")
    private String readCursor;
}
