package com.spacetime.common.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.Cursor;
import org.springframework.data.redis.core.ScanOptions;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** 小程序登录会话撤销测试。 */
@DisplayName("小程序登录会话撤销")
class MiniappTokenSessionServiceTest {

    private StringRedisTemplate redisTemplate;
    private ValueOperations<String, String> valueOperations;
    private Cursor<String> cursor;
    private MiniappTokenSessionService service;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        redisTemplate = mock(StringRedisTemplate.class);
        valueOperations = mock(ValueOperations.class);
        cursor = mock(Cursor.class);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(redisTemplate.scan(any(ScanOptions.class))).thenReturn(cursor);
        service = new MiniappTokenSessionService(redisTemplate, new ObjectMapper());
    }

    @Test
    @DisplayName("应使用 SCAN 并只删除目标用户的全部有效 token")
    void shouldScanAndDeleteOnlyTargetUserTokens() {
        when(cursor.hasNext()).thenReturn(true, true, true, false);
        when(cursor.next()).thenReturn(
                "miniapp:token:target-a",
                "miniapp:token:other",
                "miniapp:token:target-b");
        when(valueOperations.get("miniapp:token:target-a"))
                .thenReturn("{\"id\":88,\"nickname\":\"甲\",\"roles\":[],\"permissions\":[]}");
        when(valueOperations.get("miniapp:token:other"))
                .thenReturn("{\"id\":99,\"nickname\":\"乙\",\"roles\":[],\"permissions\":[]}");
        when(valueOperations.get("miniapp:token:target-b"))
                .thenReturn("{\"id\":88,\"nickname\":\"甲\",\"roles\":[],\"permissions\":[]}");

        service.revokeAllByUserId(88L);

        verify(redisTemplate).scan(any(ScanOptions.class));
        verify(redisTemplate).delete(List.of("miniapp:token:target-a", "miniapp:token:target-b"));
        verify(cursor).close();
    }

    @Test
    @DisplayName("没有目标会话时不应调用批量删除")
    void shouldNotDeleteWhenTargetHasNoSession() {
        when(cursor.hasNext()).thenReturn(false);

        service.revokeAllByUserId(88L);

        verify(redisTemplate, never()).delete(any(java.util.Collection.class));
        verify(cursor).close();
    }

    @Test
    @DisplayName("Redis 扫描失败应转成业务异常以触发数据库事务回滚")
    void shouldFailDeleteWhenRedisScanFails() {
        when(redisTemplate.scan(any(ScanOptions.class))).thenThrow(new RuntimeException("redis down"));

        assertThatThrownBy(() -> service.revokeAllByUserId(88L))
                .isInstanceOf(BusinessException.class)
                .hasMessage("用户登录态清理失败，请稍后重试");
    }
}
