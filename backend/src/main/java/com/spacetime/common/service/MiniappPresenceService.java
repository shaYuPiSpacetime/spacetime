package com.spacetime.common.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** 小程序用户最近活跃状态服务。 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MiniappPresenceService {
    private static final String ONLINE_KEY_PREFIX = "miniapp:presence:online:";
    private static final String LAST_ACTIVE_KEY_PREFIX = "miniapp:presence:last-active:";
    static final Duration ONLINE_WINDOW = Duration.ofMinutes(5);
    static final Duration LAST_ACTIVE_RETENTION = Duration.ofDays(30);

    private final StringRedisTemplate redisTemplate;

    /**
     * 记录一次已通过鉴权的小程序活跃行为。
     *
     * 在线标记5分钟自动过期，最近活跃时间保留30天用于展示相对时间。
     * 活跃记录是附加能力，写入失败不能阻断正常业务请求。
     */
    public void touch(Long userId, LocalDateTime activeTime) {
        if (userId == null || activeTime == null) {
            return;
        }
        String value = DateTimeFormatter.ISO_LOCAL_DATE_TIME.format(activeTime);
        try {
            redisTemplate.opsForValue().set(
                    ONLINE_KEY_PREFIX + userId, value, ONLINE_WINDOW);
            redisTemplate.opsForValue().set(
                    LAST_ACTIVE_KEY_PREFIX + userId, value, LAST_ACTIVE_RETENTION);
        } catch (RuntimeException ex) {
            log.debug("记录小程序用户活跃状态失败: userId={}", userId, ex);
        }
    }

    /**
     * 批量查询在线标记和最近活跃时间，Redis没有记录时使用最近登录时间兜底。
     */
    public Map<Long, PresenceSnapshot> resolve(
            Map<Long, LocalDateTime> fallbackActiveTimes,
            LocalDateTime now) {
        Map<Long, PresenceSnapshot> result = new LinkedHashMap<>();
        if (fallbackActiveTimes == null || fallbackActiveTimes.isEmpty()) {
            return result;
        }
        List<Long> userIds = new ArrayList<>(fallbackActiveTimes.keySet());
        try {
            List<String> onlineValues = redisTemplate.opsForValue().multiGet(
                    userIds.stream().map(userId -> ONLINE_KEY_PREFIX + userId).toList());
            List<String> lastActiveValues = redisTemplate.opsForValue().multiGet(
                    userIds.stream().map(userId -> LAST_ACTIVE_KEY_PREFIX + userId).toList());
            for (int index = 0; index < userIds.size(); index++) {
                Long userId = userIds.get(index);
                String onlineValue = valueAt(onlineValues, index);
                LocalDateTime redisActiveTime = parse(valueAt(lastActiveValues, index));
                if (redisActiveTime == null) {
                    redisActiveTime = parse(onlineValue);
                }
                LocalDateTime activeTime = redisActiveTime == null
                        ? fallbackActiveTimes.get(userId) : redisActiveTime;
                boolean online = onlineValue == null
                        ? isFallbackOnline(redisActiveTime, activeTime, now)
                        : parse(onlineValue) != null;
                result.put(userId, snapshot(activeTime, now, online));
            }
            return result;
        } catch (RuntimeException ex) {
            log.debug("批量查询小程序用户活跃状态失败，使用最近登录时间兜底", ex);
        }
        fallbackActiveTimes.forEach((userId, activeTime) ->
                result.put(userId, snapshot(activeTime, now)));
        return result;
    }

    private PresenceSnapshot snapshot(LocalDateTime activeTime, LocalDateTime now) {
        boolean online = activeTime != null
                && !activeTime.isBefore(now.minus(ONLINE_WINDOW));
        return snapshot(activeTime, now, online);
    }

    private PresenceSnapshot snapshot(
            LocalDateTime activeTime,
            LocalDateTime now,
            boolean online) {
        return new PresenceSnapshot(
                online ? "online" : "offline",
                activeTime,
                online ? "在线" : offlineText(activeTime, now));
    }

    private boolean isFallbackOnline(
            LocalDateTime redisActiveTime,
            LocalDateTime activeTime,
            LocalDateTime now) {
        return redisActiveTime == null
                && activeTime != null
                && !activeTime.isBefore(now.minus(ONLINE_WINDOW));
    }

    private String valueAt(List<String> values, int index) {
        return values != null && index < values.size() ? values.get(index) : null;
    }

    private LocalDateTime parse(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return LocalDateTime.parse(value, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        } catch (RuntimeException ex) {
            return null;
        }
    }

    private String offlineText(LocalDateTime activeTime, LocalDateTime now) {
        if (activeTime == null) {
            return "离线";
        }
        long minutes = Math.max(Duration.between(activeTime, now).toMinutes(), 1L);
        if (minutes < 60) {
            return minutes + "分钟前在线";
        }
        long hours = minutes / 60;
        if (hours < 24) {
            return hours + "小时前在线";
        }
        long days = hours / 24;
        return days < 7 ? days + "天前在线" : "7天前在线";
    }

    public record PresenceSnapshot(
            String onlineStatus,
            LocalDateTime lastActiveTime,
            String onlineText) {
    }
}
