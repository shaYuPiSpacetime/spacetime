package com.spacetime.miniapp.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.config.JacksonConfig;
import com.spacetime.miniapp.service.WhisperQuoteStore.WhisperQuoteSnapshot;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class RedisWhisperQuoteStoreTest {

    @Test
    void issuedQuoteShouldRoundTripWithConfiguredDateTimeFormat() {
        StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
        @SuppressWarnings("unchecked")
        ValueOperations<String, String> valueOperations = mock(ValueOperations.class);
        AtomicReference<String> storedJson = new AtomicReference<>();
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        org.mockito.Mockito.doAnswer(invocation -> {
            storedJson.set(invocation.getArgument(1));
            return null;
        }).when(valueOperations).set(anyString(), anyString(), any(Duration.class));
        when(valueOperations.get(anyString())).thenAnswer(invocation -> storedJson.get());

        Jackson2ObjectMapperBuilder builder = new Jackson2ObjectMapperBuilder();
        new JacksonConfig().jackson2ObjectMapperBuilderCustomizer().customize(builder);
        ObjectMapper objectMapper = builder.build();
        RedisWhisperQuoteStore store = new RedisWhisperQuoteStore(redisTemplate, objectMapper);
        WhisperQuoteSnapshot quote = new WhisperQuoteSnapshot(
                78L, 79L, "U79", "recommendation", null,
                "vip_free", 0, 2, "MSG-CFG-INIT-001", 7, 7,
                LocalDateTime.of(2026, 8, 13, 19, 30));

        String token = store.issue(quote);

        assertThat(store.read(token)).isEqualTo(quote);
        assertThat(storedJson.get()).contains("2026-08-13 19:30:00");
    }
}
