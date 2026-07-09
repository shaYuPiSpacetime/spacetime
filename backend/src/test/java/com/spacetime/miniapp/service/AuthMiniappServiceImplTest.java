package com.spacetime.miniapp.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.constant.AuthConstant;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserVerificationDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.miniapp.dto.request.WechatLoginReq;
import com.spacetime.miniapp.dto.response.WechatLoginVO;
import com.spacetime.miniapp.service.impl.AuthMiniappServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("小程序微信授权手机号登录 L3 测试")
class AuthMiniappServiceImplTest {

    @Mock private AppUserDao appUserDao;
    @Mock private AppUserVerificationDao verificationDao;
    @Mock private StringRedisTemplate redisTemplate;
    @Mock private ValueOperations<String, String> valueOperations;
    @Mock private WechatMiniappClient wechatMiniappClient;

    private AuthMiniappServiceImpl authService;

    @BeforeEach
    void setUp() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        authService = new AuthMiniappServiceImpl(
                appUserDao,
                verificationDao,
                redisTemplate,
                new ObjectMapper(),
                wechatMiniappClient
        );
    }

    @Test
    @DisplayName("新用户授权手机号登录后创建 app_user、认证记录并发放 token")
    void wechatPhoneLogin_newUser_shouldCreateUserAndToken() {
        WechatLoginReq req = new WechatLoginReq();
        req.setLoginCode("wx-login-code");
        req.setPhoneCode("wx-phone-code");
        req.setAgreeProtocol(true);

        when(wechatMiniappClient.code2Session("wx-login-code"))
                .thenReturn(new WechatMiniappClient.SessionInfo("openid_real_001", "unionid_real_001"));
        when(wechatMiniappClient.getPhoneNumber("wx-phone-code"))
                .thenReturn(new WechatMiniappClient.PhoneInfo("13800138000", "13800138000", "86"));
        when(appUserDao.selectOne(any())).thenReturn(null);
        doAnswer(invocation -> {
            AppUser user = invocation.getArgument(0);
            user.setId(99L);
            return null;
        }).when(appUserDao).insert(any(AppUser.class));

        WechatLoginVO result = authService.wechatLogin(req);

        assertThat(result.getToken()).isNotBlank();
        assertThat(result.getUserId()).isEqualTo(99L);
        assertThat(result.getOpenid()).isEqualTo("openid_real_001");
        assertThat(result.getPhone()).isEqualTo("13800138000");
        assertThat(result.getMaskedPhone()).isEqualTo("138****8000");
        assertThat(result.getFirstLoginCompleted()).isFalse();

        verify(appUserDao).insert(argThat(user ->
                "openid_real_001".equals(user.getOpenid())
                        && "unionid_real_001".equals(user.getUnionid())
                        && "13800138000".equals(user.getPhone())
                        && user.getPhoneHash() != null
                        && !user.getPhoneHash().contains("13800138000")
                        && AccountStatusEnum.NORMAL.getCode().equals(user.getAccountStatus())
        ));
        verify(verificationDao).insert(argThat(verification -> Long.valueOf(99L).equals(verification.getUserId())));
        verify(valueOperations).set(startsWith(AuthConstant.MINIAPP_TOKEN_PREFIX), anyString(), eq(Duration.ofDays(7)));
    }

    @Test
    @DisplayName("老用户再次授权手机号登录后更新 unionid、手机号和登录时间")
    void wechatPhoneLogin_existingUser_shouldUpdatePhoneAndReturnState() {
        WechatLoginReq req = new WechatLoginReq();
        req.setLoginCode("wx-login-code");
        req.setPhoneCode("wx-phone-code");
        req.setAgreeProtocol(true);

        AppUser existing = new AppUser();
        existing.setId(7L);
        existing.setOpenid("openid_real_001");
        existing.setPhone("13900139000");
        existing.setAccountStatus(AccountStatusEnum.NORMAL.getCode());
        existing.setFirstLoginCompleted(1);

        when(wechatMiniappClient.code2Session("wx-login-code"))
                .thenReturn(new WechatMiniappClient.SessionInfo("openid_real_001", "unionid_real_002"));
        when(wechatMiniappClient.getPhoneNumber("wx-phone-code"))
                .thenReturn(new WechatMiniappClient.PhoneInfo("13800138000", "13800138000", "86"));
        when(appUserDao.selectOne(any())).thenReturn(existing);

        WechatLoginVO result = authService.wechatLogin(req);

        assertThat(result.getUserId()).isEqualTo(7L);
        assertThat(result.getOpenid()).isEqualTo("openid_real_001");
        assertThat(result.getPhone()).isEqualTo("13800138000");
        assertThat(result.getFirstLoginCompleted()).isTrue();

        verify(appUserDao).updateById(argThat(user ->
                "unionid_real_002".equals(user.getUnionid())
                        && "13800138000".equals(user.getPhone())
                        && user.getPhoneHash() != null
                        && user.getLastLoginTime() != null
        ));
    }
}
