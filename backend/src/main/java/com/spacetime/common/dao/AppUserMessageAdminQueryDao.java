package com.spacetime.common.dao;

import com.spacetime.common.model.message.AppUserPlatformMessageProjection;
import com.spacetime.common.model.message.AppUserPrivateMessageProjection;

import java.time.LocalDateTime;
import java.util.List;

/** App 用户消息互动专用只读 DAO。 */
public interface AppUserMessageAdminQueryDao {
    List<AppUserPrivateMessageProjection> selectPrivateMessages(Long userId, int offset, int limit);
    long countPrivateMessages(Long userId);
    long countPrivateUnread(Long userId);
    List<AppUserPlatformMessageProjection> selectPlatformMessages(Long userId, int offset, int limit);
    long countPlatformMessages(Long userId);
    long countSystemUnread(Long userId, LocalDateTime now);
    long countAssistantUnread(Long userId, LocalDateTime now);
}
