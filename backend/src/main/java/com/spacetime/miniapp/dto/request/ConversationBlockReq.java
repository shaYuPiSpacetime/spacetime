package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Data;

/** 私信会话拉黑请求。 */
@Data
public class ConversationBlockReq {
    @Size(max = 32, message = "来源场景长度不能超过32个字符")
    private String sourceScene;
}
