package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** 私信会话女性保护状态。 */
@Data
public class MessageFemaleProtectionVO {
    private Boolean enabled;
    private Boolean waitingForFemaleFirstMessage;
    private LocalDateTime protectionUntil;
}
