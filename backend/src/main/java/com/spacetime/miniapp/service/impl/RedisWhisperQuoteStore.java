package com.spacetime.miniapp.service.impl;

import cn.hutool.core.util.IdUtil;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.miniapp.service.WhisperQuoteStore;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

/** Redis 悄悄话报价快照实现。 */
@Service
@RequiredArgsConstructor
public class RedisWhisperQuoteStore implements WhisperQuoteStore {
    private static final int QUOTE_EXPIRED = 30021;
    private static final Duration QUOTE_TTL = Duration.ofMinutes(10);
    private static final String KEY_PREFIX = "miniapp:message:whisper:quote:";

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    @Override
    public String issue(WhisperQuoteSnapshot snapshot) {
        String token = "wq_" + IdUtil.fastSimpleUUID();
        try {
            redisTemplate.opsForValue().set(KEY_PREFIX + token,
                    objectMapper.writeValueAsString(snapshot), QUOTE_TTL);
            return token;
        } catch (JsonProcessingException ex) {
            throw new BusinessException(5001, "生成悄悄话报价失败，请稍后重试");
        }
    }

    @Override
    public WhisperQuoteSnapshot read(String quoteToken) {
        if (quoteToken == null || quoteToken.isBlank()) {
            throw new BusinessException(QUOTE_EXPIRED, "悄悄话报价已过期，请重新确认");
        }
        String json = redisTemplate.opsForValue().get(KEY_PREFIX + quoteToken.trim());
        if (json == null || json.isBlank()) {
            throw new BusinessException(QUOTE_EXPIRED, "悄悄话报价已过期，请重新确认");
        }
        try {
            return objectMapper.readValue(json, WhisperQuoteSnapshot.class);
        } catch (JsonProcessingException ex) {
            throw new BusinessException(QUOTE_EXPIRED, "悄悄话报价无效，请重新确认");
        }
    }
}
