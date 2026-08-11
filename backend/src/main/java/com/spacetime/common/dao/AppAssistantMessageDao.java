package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.AppAssistantMessage;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

/** 官方助手消息数据访问接口。 */
public interface AppAssistantMessageDao {
    AppAssistantMessage selectById(Long id);
    AppAssistantMessage selectByMessageNo(String messageNo);
    AppAssistantMessage selectByUserTopicVersion(Long userId, String topicCode,
                                                 String contentVersion);
    Page<AppAssistantMessage> selectPage(Page<AppAssistantMessage> page,
                                         LambdaQueryWrapper<AppAssistantMessage> wrapper);
    List<AppAssistantMessage> selectVisible(Long userId, Long cursorId, int size,
                                            LocalDateTime now);
    long countUnreadVisible(Long userId, LocalDateTime now);
    List<String> selectReadableNos(Long userId, Collection<String> messageNos,
                                   LocalDateTime now);
    int markReadBatch(Long userId, Collection<String> messageNos, LocalDateTime readAt);
    void insert(AppAssistantMessage entity);
    int updateById(AppAssistantMessage entity);
}
