package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.AppSystemMessage;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

/** 用户系统站内消息数据访问接口。 */
public interface AppSystemMessageDao {
    AppSystemMessage selectById(Long id);
    AppSystemMessage selectByNoticeNo(String noticeNo);
    AppSystemMessage selectByEvent(String producerEventId, Long receiverUserId, String bizType);
    Page<AppSystemMessage> selectPage(Page<AppSystemMessage> page,
                                      LambdaQueryWrapper<AppSystemMessage> wrapper);
    List<AppSystemMessage> selectVisible(Long userId, Long cursorId, int size,
                                         LocalDateTime now, boolean safetyOnly);
    long countUnreadVisible(Long userId, LocalDateTime now, boolean safetyOnly);
    List<String> selectReadableNos(Long userId, Collection<String> noticeNos,
                                   LocalDateTime now, boolean safetyOnly);
    int markReadBatch(Long userId, Collection<String> noticeNos, LocalDateTime readAt);
    void insert(AppSystemMessage entity);
    int updateById(AppSystemMessage entity);
}
