package com.spacetime.common.service;

import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.lang.reflect.Constructor;
import java.lang.reflect.Method;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MiniappPresenceServiceTest {

    @Test
    void authenticatedActivityRefreshesRedisAndFiveMinuteWindowDrivesOnlineStatus() throws Exception {
        StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
        @SuppressWarnings("unchecked")
        ValueOperations<String, String> valueOperations = mock(ValueOperations.class);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        Constructor<MiniappPresenceService> constructor =
                MiniappPresenceService.class.getConstructor(StringRedisTemplate.class);
        MiniappPresenceService service = constructor.newInstance(redisTemplate);
        Method touch = MiniappPresenceService.class.getMethod(
                "touch", Long.class, LocalDateTime.class);
        LocalDateTime now = LocalDateTime.of(2026, 7, 23, 19, 0);

        touch.invoke(service, 7L, now);

        verify(valueOperations).set(
                "miniapp:presence:online:7",
                "2026-07-23T19:00:00",
                Duration.ofMinutes(5));
        verify(valueOperations).set(
                "miniapp:presence:last-active:7",
                "2026-07-23T19:00:00",
                Duration.ofDays(30));

        Map<Long, LocalDateTime> fallback = new LinkedHashMap<>();
        fallback.put(7L, now.minusDays(1));
        fallback.put(8L, now.minusDays(1));
        when(valueOperations.multiGet(List.of(
                "miniapp:presence:online:7",
                "miniapp:presence:online:8")))
                .thenReturn(Arrays.asList("2026-07-23T18:59:00", null));
        when(valueOperations.multiGet(List.of(
                "miniapp:presence:last-active:7",
                "miniapp:presence:last-active:8")))
                .thenReturn(List.of(
                        "2026-07-23T18:59:00",
                        "2026-07-23T17:55:00"));

        Map<Long, MiniappPresenceService.PresenceSnapshot> result =
                service.resolve(fallback, now);

        assertThat(result.get(7L).onlineStatus()).isEqualTo("online");
        assertThat(result.get(7L).onlineText()).isEqualTo("在线");
        assertThat(result.get(7L).lastActiveTime()).isEqualTo(now.minusMinutes(1));
        assertThat(result.get(8L).onlineStatus()).isEqualTo("offline");
        assertThat(result.get(8L).onlineText()).isEqualTo("1小时前在线");
        assertThat(result.get(8L).lastActiveTime()).isEqualTo(now.minusMinutes(65));
    }
}
