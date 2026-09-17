package com.spacetime.common.task;

import com.spacetime.common.service.VirtualPriceChangeService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

/** 定时串行推进待发布商品。 */
@Component
@RequiredArgsConstructor
public class VirtualPriceChangeJob {
    private static final String LOCK_KEY = "wechat:virtual:goods-sync:lock";
    private final VirtualPriceChangeService service;
    private final StringRedisTemplate redisTemplate;

    @Scheduled(fixedDelayString = "${wechat-virtual-pay.goods-sync-delay-ms:60000}")
    public void advance() {
        String owner = UUID.randomUUID().toString();
        Boolean acquired = redisTemplate.opsForValue().setIfAbsent(LOCK_KEY, owner, Duration.ofSeconds(45));
        if (!Boolean.TRUE.equals(acquired)) {
            return;
        }
        try {
            service.advanceOne();
        } finally {
            DefaultRedisScript<Long> release = new DefaultRedisScript<>(
                    "if redis.call('get', KEYS[1]) == ARGV[1] then "
                            + "return redis.call('del', KEYS[1]) else return 0 end", Long.class);
            redisTemplate.execute(release, List.of(LOCK_KEY), owner);
        }
    }
}
