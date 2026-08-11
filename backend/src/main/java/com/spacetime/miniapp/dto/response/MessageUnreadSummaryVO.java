package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** 消息中心未读汇总；普通私信发送仍由 TIM 承接，已读事实由平台同步保存。 */
@Data
public class MessageUnreadSummaryVO {
    private Long privateUnreadCount;
    private Long whisperUnreadCount;
    private Long assistantUnreadCount;
    private Long systemUnreadCount;
    /** 兼容口径：悄悄话、官方助手和系统消息未读之和。 */
    private Long platformUnreadCount;
    /** 页面总角标：普通私信、悄悄话、官方助手和系统消息未读之和。 */
    private Long messageUnreadCount;
    private LocalDateTime snapshotTime;
}
