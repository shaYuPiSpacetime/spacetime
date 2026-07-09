package com.spacetime.miniapp.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserVerificationDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserVerification;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.miniapp.dto.request.PhoneLoginReq;
import com.spacetime.miniapp.dto.request.WechatLoginReq;
import com.spacetime.miniapp.service.impl.AuthMiniappServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Miniapp auth API contract")
class AuthMiniappServiceContractTest {

    @Mock
    private AppUserDao appUserDao;
    @Mock
    private AppUserVerificationDao verificationDao;
    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private ValueOperations<String, String> valueOperations;
    @Mock
    private WechatMiniappClient wechatMiniappClient;

    private AuthMiniappService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthMiniappServiceImpl(
                appUserDao,
                verificationDao,
                redisTemplate,
                new ObjectMapper(),
                wechatMiniappClient);
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        lenient().doAnswer(invocation -> {
            AppUser user = invocation.getArgument(0);
            user.setId(1001L);
            return 1;
        }).when(appUserDao).insert(any(AppUser.class));
    }

    @Test
    @DisplayName("wechat-login returns the full mobile handoff response")
    void wechatLoginShouldReturnFullContract() {
        when(appUserDao.selectOne(any())).thenReturn(null);

        WechatLoginReq req = new WechatLoginReq();
        req.setLoginCode("wx-login-code");
        req.setPhoneCode("wx-phone-code");
        req.setEncryptedData("encrypted");
        req.setIv("iv");
        req.setAgreeProtocol(true);
        when(wechatMiniappClient.code2Session("wx-login-code"))
                .thenReturn(new WechatMiniappClient.SessionInfo("openid_real_contract", "unionid_real_contract"));
        when(wechatMiniappClient.getPhoneNumber("wx-phone-code"))
                .thenReturn(new WechatMiniappClient.PhoneInfo("13800138000", "13800138000", "86"));

        var vo = authService.wechatLogin(req);

        assertThat(vo.getToken()).isNotBlank();
        assertThat(vo.getUserId()).isEqualTo(1001L);
        assertThat(vo.getIsNewUser()).isTrue();
        assertThat(vo.getFirstLoginCompleted()).isFalse();
        assertThat(vo.getNextStep()).isEqualTo(1);
        assertThat(vo.getAccessStatus()).isNotNull();
        assertThat(vo.getAccessStatus().getCanBrowseCards()).isFalse();
    }

    @Test
    @DisplayName("wechat-login rejects unchecked protocol")
    void wechatLoginShouldRequireProtocolAgreement() {
        WechatLoginReq req = new WechatLoginReq();
        req.setLoginCode("wx-login-code");
        req.setPhoneCode("wx-phone-code");
        req.setAgreeProtocol(false);

        assertThatThrownBy(() -> authService.wechatLogin(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("AUTH_PROTOCOL_REQUIRED");
    }

    @Test
    @DisplayName("phone-login creates user and binds phone in verification record")
    void phoneLoginShouldCreateUserAndBindPhone() {
        when(appUserDao.selectOne(any())).thenReturn(null);

        PhoneLoginReq req = new PhoneLoginReq();
        req.setPhone("13800138000");
        req.setSmsCode("000000");
        req.setAgreeProtocol(true);

        var vo = authService.phoneLogin(req);

        assertThat(vo.getIsNewUser()).isTrue();
        assertThat(vo.getNextStep()).isEqualTo(1);

        ArgumentCaptor<AppUserVerification> captor = ArgumentCaptor.forClass(AppUserVerification.class);
        verify(verificationDao).insert(captor.capture());
        assertThat(captor.getValue().getBoundPhone()).isEqualTo("13800138000");
    }

    @Test
    @DisplayName("phone-login rejects invalid mock sms code")
    void phoneLoginShouldRejectInvalidSmsCode() {
        PhoneLoginReq req = new PhoneLoginReq();
        req.setPhone("13800138000");
        req.setSmsCode("111111");
        req.setAgreeProtocol(true);

        assertThatThrownBy(() -> authService.phoneLogin(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("AUTH_SMS_INVALID");
    }
}
