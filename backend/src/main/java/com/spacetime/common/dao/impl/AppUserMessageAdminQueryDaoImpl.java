package com.spacetime.common.dao.impl;

import com.spacetime.common.dao.AppUserMessageAdminQueryDao;
import com.spacetime.common.mapper.AppUserMessageAdminQueryMapper;
import com.spacetime.common.model.message.AppUserPlatformMessageProjection;
import com.spacetime.common.model.message.AppUserPrivateMessageProjection;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/** App 用户消息互动专用只读 DAO 实现。 */
@Repository
@RequiredArgsConstructor
public class AppUserMessageAdminQueryDaoImpl implements AppUserMessageAdminQueryDao {
    private final AppUserMessageAdminQueryMapper mapper;

    @Override
    public List<AppUserPrivateMessageProjection> selectPrivateMessages(Long userId, int offset, int limit) {
        return mapper.selectPrivateMessages(userId, Math.max(0, offset), bounded(limit));
    }

    @Override
    public long countPrivateMessages(Long userId) {
        return mapper.countPrivateMessages(userId);
    }

    @Override
    public long countPrivateUnread(Long userId) {
        return mapper.countPrivateUnread(userId);
    }

    @Override
    public List<AppUserPlatformMessageProjection> selectPlatformMessages(Long userId, int offset, int limit) {
        return mapper.selectPlatformMessages(userId, Math.max(0, offset), bounded(limit));
    }

    @Override
    public long countPlatformMessages(Long userId) {
        return mapper.countPlatformMessages(userId);
    }

    @Override
    public long countSystemUnread(Long userId, LocalDateTime now) {
        return mapper.countSystemUnread(userId, now);
    }

    @Override
    public long countAssistantUnread(Long userId, LocalDateTime now) {
        return mapper.countAssistantUnread(userId, now);
    }

    private int bounded(int value) {
        return Math.max(1, Math.min(value, 100));
    }
}
