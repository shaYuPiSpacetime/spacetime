package com.spacetime.common.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.constant.AuthConstant;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.interceptor.UserContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.Cursor;
import org.springframework.data.redis.core.ScanOptions;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/** 小程序登录会话管理。 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MiniappTokenSessionService {

    private static final long SCAN_BATCH_SIZE = 200L;

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    /**
     * 撤销指定用户的全部小程序 token。
     * 使用 SCAN 避免 KEYS 阻塞 Redis；无法解析的 token 本身不能通过登录拦截器，直接跳过。
     */
    public void revokeAllByUserId(Long userId) {
        if (userId == null || userId <= 0) {
            throw new BusinessException("用户ID无效");
        }
        List<String> targetKeys = new ArrayList<>();
        ScanOptions options = ScanOptions.scanOptions()
                .match(AuthConstant.MINIAPP_TOKEN_PREFIX + "*")
                .count(SCAN_BATCH_SIZE)
                .build();
        try (Cursor<String> cursor = redisTemplate.scan(options)) {
            while (cursor.hasNext()) {
                String key = cursor.next();
                String json = redisTemplate.opsForValue().get(key);
                if (belongsTo(json, userId)) {
                    targetKeys.add(key);
                }
            }
            if (!targetKeys.isEmpty()) {
                redisTemplate.delete(targetKeys);
            }
        } catch (Exception e) {
            log.error("撤销小程序用户登录态失败，userId={}", userId, e);
            throw new BusinessException("用户登录态清理失败，请稍后重试");
        }
    }

    private boolean belongsTo(String json, Long userId) {
        if (json == null) {
            return false;
        }
        try {
            UserContext context = objectMapper.readValue(json, UserContext.class);
            return userId.equals(context.getId());
        } catch (JsonProcessingException e) {
            log.warn("跳过无法解析的小程序 token 会话");
            return false;
        }
    }
}
