package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** 消息中心未读汇总。 */
@Data
public class MessageUnreadSummaryVO {
    private Long privateUnreadCount;
    private Long whisperUnreadCount;
    private Long assistantUnreadCount;
    private Long systemUnreadCount;
    /** 页面总角标：普通私信、悄悄话、官方助手和系统消息未读之和。 */
    private Long messageUnreadCount;
    private LocalDateTime snapshotTime;
}
