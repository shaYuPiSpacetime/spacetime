package com.spacetime.common.interceptor;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.constant.AuthConstant;
import com.spacetime.common.service.MiniappPresenceService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.lang.reflect.Constructor;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TokenInterceptorPresenceTest {

    @AfterEach
    void clearContext() {
        UserContextHolder.clear();
    }

    @Test
    void successfulMiniappAuthenticationRefreshesPresence() throws Exception {
        Fixture fixture = fixture("/miniapp/relation/likes-me", "mini-token", 7L);

        boolean allowed = fixture.interceptor().preHandle(
                fixture.request(), fixture.response(), new Object());

        assertThat(allowed).isTrue();
        verify(fixture.presenceService()).touch(eq(7L), any(LocalDateTime.class));
    }

    @Test
    void adminAuthenticationDoesNotRefreshMiniappPresence() throws Exception {
        Fixture fixture = fixture("/admin/users", "admin-token", 1L);

        boolean allowed = fixture.interceptor().preHandle(
                fixture.request(), fixture.response(), new Object());

        assertThat(allowed).isTrue();
        verify(fixture.presenceService(), never()).touch(any(), any());
    }

    private Fixture fixture(String uri, String token, Long userId) throws Exception {
        StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
        @SuppressWarnings("unchecked")
        ValueOperations<String, String> valueOperations = mock(ValueOperations.class);
        ObjectMapper objectMapper = mock(ObjectMapper.class);
        MiniappPresenceService presenceService = mock(MiniappPresenceService.class);
        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(request.getHeader(AuthConstant.TOKEN_HEADER)).thenReturn(token);
        when(request.getRequestURI()).thenReturn(uri);
        String prefix = uri.startsWith("/admin/")
                ? AuthConstant.ADMIN_TOKEN_PREFIX : AuthConstant.MINIAPP_TOKEN_PREFIX;
        when(valueOperations.get(prefix + token)).thenReturn("{\"id\":" + userId + "}");
        when(objectMapper.readValue(any(String.class), eq(UserContext.class)))
                .thenReturn(new UserContext(userId, "测试用户", List.of(), List.of()));
        Constructor<TokenInterceptor> constructor = TokenInterceptor.class.getConstructor(
                StringRedisTemplate.class, ObjectMapper.class, MiniappPresenceService.class);
        TokenInterceptor interceptor = constructor.newInstance(
                redisTemplate, objectMapper, presenceService);
        return new Fixture(
                interceptor, presenceService, request, response);
    }

    private record Fixture(
            TokenInterceptor interceptor,
            MiniappPresenceService presenceService,
            HttpServletRequest request,
            HttpServletResponse response) {
    }
}
