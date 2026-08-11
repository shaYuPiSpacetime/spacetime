package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.AppSystemMessageDao;
import com.spacetime.common.entity.AppSystemMessage;
import com.spacetime.common.mapper.AppSystemMessageMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

/** 用户系统站内消息数据访问实现。 */
@Repository
@RequiredArgsConstructor
public class AppSystemMessageDaoImpl implements AppSystemMessageDao {
    private final AppSystemMessageMapper mapper;

    @Override
    public AppSystemMessage selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public AppSystemMessage selectByNoticeNo(String noticeNo) {
        return mapper.selectOne(new LambdaQueryWrapper<AppSystemMessage>()
                .eq(AppSystemMessage::getNoticeNo, noticeNo));
    }

    @Override
    public AppSystemMessage selectByEvent(String producerEventId, Long receiverUserId, String bizType) {
        return mapper.selectOne(new LambdaQueryWrapper<AppSystemMessage>()
                .eq(AppSystemMessage::getProducerEventId, producerEventId)
                .eq(AppSystemMessage::getReceiverUserId, receiverUserId)
                .eq(AppSystemMessage::getBizType, bizType));
    }

    @Override
    public Page<AppSystemMessage> selectPage(Page<AppSystemMessage> page,
                                              LambdaQueryWrapper<AppSystemMessage> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public List<AppSystemMessage> selectVisible(Long userId, Long cursorId, int size,
                                                LocalDateTime now, boolean safetyOnly) {
        return mapper.selectList(visibleQuery(userId, now, safetyOnly)
                .lt(cursorId != null, AppSystemMessage::getId, cursorId)
                .orderByDesc(AppSystemMessage::getId)
                .last("LIMIT " + Math.max(1, Math.min(size, 51))));
    }

    @Override
    public long countUnreadVisible(Long userId, LocalDateTime now, boolean safetyOnly) {
        return mapper.selectCount(visibleQuery(userId, now, safetyOnly)
                .isNull(AppSystemMessage::getReadAt));
    }

    @Override
    public List<String> selectReadableNos(Long userId, Collection<String> noticeNos,
                                           LocalDateTime now, boolean safetyOnly) {
        if (noticeNos == null || noticeNos.isEmpty()) {
            return List.of();
        }
        return mapper.selectList(visibleQuery(userId, now, safetyOnly)
                        .in(AppSystemMessage::getNoticeNo, noticeNos))
                .stream().map(AppSystemMessage::getNoticeNo).toList();
    }

    @Override
    public int markReadBatch(Long userId, Collection<String> noticeNos, LocalDateTime readAt) {
        if (noticeNos == null || noticeNos.isEmpty()) {
            return 0;
        }
        return mapper.update(null, new LambdaUpdateWrapper<AppSystemMessage>()
                .eq(AppSystemMessage::getReceiverUserId, userId)
                .in(AppSystemMessage::getNoticeNo, noticeNos)
                .isNull(AppSystemMessage::getReadAt)
                .set(AppSystemMessage::getReadAt, readAt)
                .set(AppSystemMessage::getUpdateTime, readAt));
    }

    private LambdaQueryWrapper<AppSystemMessage> visibleQuery(Long userId, LocalDateTime now,
                                                               boolean safetyOnly) {
        return new LambdaQueryWrapper<AppSystemMessage>()
                .eq(AppSystemMessage::getReceiverUserId, userId)
                .gt(AppSystemMessage::getVisibleUntil, now)
                .eq(safetyOnly, AppSystemMessage::getSafetyRequired, 1);
    }

    @Override
    public void insert(AppSystemMessage entity) {
        mapper.insert(entity);
    }

    @Override
    public int updateById(AppSystemMessage entity) {
        return mapper.updateById(entity);
    }
}
