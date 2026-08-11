package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.AppAssistantMessageDao;
import com.spacetime.common.entity.AppAssistantMessage;
import com.spacetime.common.mapper.AppAssistantMessageMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

/** 官方助手消息数据访问实现。 */
@Repository
@RequiredArgsConstructor
public class AppAssistantMessageDaoImpl implements AppAssistantMessageDao {
    private final AppAssistantMessageMapper mapper;

    @Override
    public AppAssistantMessage selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public AppAssistantMessage selectByMessageNo(String messageNo) {
        return mapper.selectOne(new LambdaQueryWrapper<AppAssistantMessage>()
                .eq(AppAssistantMessage::getAssistantMessageNo, messageNo));
    }

    @Override
    public AppAssistantMessage selectByUserTopicVersion(Long userId, String topicCode,
                                                        String contentVersion) {
        return mapper.selectOne(new LambdaQueryWrapper<AppAssistantMessage>()
                .eq(AppAssistantMessage::getReceiverUserId, userId)
                .eq(AppAssistantMessage::getTopicCode, topicCode)
                .eq(AppAssistantMessage::getContentVersion, contentVersion));
    }

    @Override
    public Page<AppAssistantMessage> selectPage(Page<AppAssistantMessage> page,
                                                 LambdaQueryWrapper<AppAssistantMessage> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public List<AppAssistantMessage> selectVisible(Long userId, Long cursorId, int size,
                                                    LocalDateTime now) {
        return mapper.selectList(visibleQuery(userId, now)
                .lt(cursorId != null, AppAssistantMessage::getId, cursorId)
                .orderByDesc(AppAssistantMessage::getId)
                .last("LIMIT " + Math.max(1, Math.min(size, 51))));
    }

    @Override
    public long countUnreadVisible(Long userId, LocalDateTime now) {
        return mapper.selectCount(visibleQuery(userId, now)
                .isNull(AppAssistantMessage::getReadAt));
    }

    @Override
    public List<String> selectReadableNos(Long userId, Collection<String> messageNos,
                                           LocalDateTime now) {
        if (messageNos == null || messageNos.isEmpty()) {
            return List.of();
        }
        return mapper.selectList(visibleQuery(userId, now)
                        .in(AppAssistantMessage::getAssistantMessageNo, messageNos))
                .stream().map(AppAssistantMessage::getAssistantMessageNo).toList();
    }

    @Override
    public int markReadBatch(Long userId, Collection<String> messageNos, LocalDateTime readAt) {
        if (messageNos == null || messageNos.isEmpty()) {
            return 0;
        }
        return mapper.update(null, new LambdaUpdateWrapper<AppAssistantMessage>()
                .eq(AppAssistantMessage::getReceiverUserId, userId)
                .in(AppAssistantMessage::getAssistantMessageNo, messageNos)
                .isNull(AppAssistantMessage::getReadAt)
                .set(AppAssistantMessage::getReadAt, readAt)
                .set(AppAssistantMessage::getUpdateTime, readAt));
    }

    private LambdaQueryWrapper<AppAssistantMessage> visibleQuery(Long userId, LocalDateTime now) {
        return new LambdaQueryWrapper<AppAssistantMessage>()
                .eq(AppAssistantMessage::getReceiverUserId, userId)
                .le(AppAssistantMessage::getVisibleFrom, now)
                .and(query -> query.isNull(AppAssistantMessage::getVisibleUntil)
                        .or().gt(AppAssistantMessage::getVisibleUntil, now));
    }

    @Override
    public void insert(AppAssistantMessage entity) {
        mapper.insert(entity);
    }

    @Override
    public int updateById(AppAssistantMessage entity) {
        return mapper.updateById(entity);
    }
}
