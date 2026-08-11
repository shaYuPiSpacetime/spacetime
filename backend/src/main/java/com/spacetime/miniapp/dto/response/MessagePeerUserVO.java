package com.spacetime.miniapp.dto.response;

import lombok.Data;

/** 消息场景中的对方用户摘要。 */
@Data
public class MessagePeerUserVO {
    private Long userId;
    private String nickname;
    private String avatarUrl;
    private Boolean profileAvailable;
}
