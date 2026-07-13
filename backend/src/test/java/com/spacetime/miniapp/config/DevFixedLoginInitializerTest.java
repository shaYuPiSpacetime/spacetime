package com.spacetime.miniapp.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.constant.AuthConstant;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.interceptor.UserContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.ApplicationArguments;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;
import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DevFixedLoginInitializerTest {

    private static final String TOKEN = "dev-fixed-token-17366629764";
    private static final String PHONE = "17366629764";

    private AppUserDao appUserDao;
    private StringRedisTemplate redisTemplate;
    private ValueOperations<String, String> valueOperations;
    private ObjectMapper objectMapper;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        appUserDao = mock(AppUserDao.class);
        redisTemplate = mock(StringRedisTemplate.class);
        valueOperations = mock(ValueOperations.class);
        objectMapper = new ObjectMapper();
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
    }

    @Test
    void shouldWriteFixedTokenWithoutExpirationForConfiguredPhone() throws Exception {
        AppUser user = new AppUser();
        user.setId(50L);
        user.setPhone(PHONE);
        user.setNickname("筱脑虎");
        when(appUserDao.selectOne(any())).thenReturn(user);

        DevFixedLoginInitializer initializer = new DevFixedLoginInitializer(
                appUserDao, redisTemplate, objectMapper, true, TOKEN, PHONE);
        initializer.run(mock(ApplicationArguments.class));

        UserContext expected = new UserContext(50L, "筱脑虎", Collections.emptyList(), Collections.emptyList());
        verify(valueOperations).set(
                AuthConstant.MINIAPP_TOKEN_PREFIX + TOKEN,
                objectMapper.writeValueAsString(expected));
        verify(valueOperations, never()).set(anyString(), anyString(), any(Duration.class));
    }

    @Test
    void shouldDoNothingWhenFixedLoginIsDisabled() throws Exception {
        DevFixedLoginInitializer initializer = new DevFixedLoginInitializer(
                appUserDao, redisTemplate, objectMapper, false, TOKEN, PHONE);

        initializer.run(mock(ApplicationArguments.class));

        verify(appUserDao, never()).selectOne(any());
        verify(redisTemplate, never()).opsForValue();
    }
}
