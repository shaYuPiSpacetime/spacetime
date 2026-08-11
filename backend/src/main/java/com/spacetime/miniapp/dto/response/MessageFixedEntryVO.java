package com.spacetime.miniapp.dto.response;

import lombok.Data;

/** 消息首页固定频道入口。 */
@Data
public class MessageFixedEntryVO {
    private String entryType;
    private String title;
    private String lastMessagePreview;
    private Long unreadCount;
    private Boolean enabled;
}
