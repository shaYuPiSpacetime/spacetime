package com.spacetime.common.service;

import java.time.LocalDateTime;

/** 消息正文分类留存服务。 */
public interface MessageRetentionService {
    /** 仅清空已到期正文列，消息元数据和 TIM 映射继续保留。 */
    int clearExpiredMessageContent(LocalDateTime now, int limit);
}
