package com.spacetime.miniapp.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.dao.AppConfigDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.entity.AppConfig;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.common.provider.SmsCodeProvider;
import com.spacetime.common.service.AppUserAuditService;
import com.spacetime.common.service.AppUserAuditContentService;
import com.spacetime.miniapp.dto.request.PhoneLoginReq;
import com.spacetime.miniapp.dto.request.PhoneSmsCodeReq;
import com.spacetime.miniapp.dto.response.PhoneSmsCodeVO;
import com.spacetime.miniapp.dto.response.WechatLoginVO;
import com.spacetime.miniapp.service.impl.AuthMiniappServiceImpl;
import com.spacetime.miniapp.service.impl.Prd01FieldConfigResolver;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("Miniapp phone login SMS code")
class AuthMiniappServiceImplTest {

    @Mock
    private AppUserDao appUserDao;
    @Mock
    private AppUserAuditService auditService;
    @Mock
    private AppUserAuditContentService auditContentService;
    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private ValueOperations<String, String> valueOps;
    private final ObjectMapper objectMapper = new ObjectMapper();
    @Mock
    private WechatMiniappClient wechatMiniappClient;
    @Mock
    private AppConfigDao appConfigDao;
    @Mock
    private SmsCodeProvider smsCodeProvider;

    private AuthMiniappServiceImpl authService;

    @BeforeEach
    void setUp() {
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        when(smsCodeProvider.providerCode()).thenReturn("MOCK");
        when(smsCodeProvider.generateCode()).thenReturn("000000");
        when(appConfigDao.selectByKey("prd01.security.sms.rules")).thenReturn(config(
                "{\"rows\":[{\"key\":\"sendCountdownSeconds\",\"value\":\"45\"},{\"key\":\"validMinutes\",\"value\":\"3\"},{\"key\":\"dailySendLimit\",\"value\":\"8\"}]}"));
        authService = new AuthMiniappServiceImpl(
                appUserDao,
                auditService,
                auditContentService,
                redisTemplate,
                objectMapper,
                wechatMiniappClient,
                appConfigDao,
                smsCodeProvider,
                new Prd01FieldConfigResolver(appConfigDao, objectMapper));
    }

    @Test
    @DisplayName("发送验证码按后台配置写入验证码、倒计时和每日次数")
    void shouldSendSmsCodeWithConfiguredRules() {
        when(valueOps.get(anyString())).thenReturn(null);

        PhoneSmsCodeReq req = new PhoneSmsCodeReq();
        req.setPhone("13800138000");
        PhoneSmsCodeVO vo = authService.sendPhoneSmsCode(req);

        assertThat(vo.getCountdownSeconds()).isEqualTo(45);
        assertThat(vo.getValidMinutes()).isEqualTo(3);
        assertThat(vo.getDailyLimit()).isEqualTo(8);
        assertThat(vo.getDailyRemaining()).isEqualTo(7);
        assertThat(vo.getProviderCode()).isEqualTo("MOCK");
        verify(smsCodeProvider).sendLoginCode("13800138000", "000000", 3);
        verify(valueOps).set("miniapp:auth:sms:code:13800138000", "000000", Duration.ofMinutes(3));
        verify(valueOps).set("miniapp:auth:sms:cooldown:13800138000", "1", Duration.ofSeconds(45));
        verify(valueOps).set(argThat(key -> key.startsWith("miniapp:auth:sms:daily:")), eq("1"), any(Duration.class));
    }

    @Test
    @DisplayName("手机号登录必须匹配 Redis 中未过期验证码，成功后消费验证码")
    void shouldLoginWithStoredSmsCodeAndConsumeIt() {
        when(valueOps.get("miniapp:auth:sms:code:13800138000")).thenReturn("000000");
        AppUser user = new AppUser();
        user.setId(9L);
        user.setOpenid("phone_13800138000");
        user.setPhone("13800138000");
        user.setAccountStatus(AccountStatusEnum.NORMAL.getCode());
        user.setFirstLoginCompleted(0);
        when(appUserDao.selectOne(any())).thenReturn(user);

        PhoneLoginReq req = new PhoneLoginReq();
        req.setPhone("13800138000");
        req.setSmsCode("000000");
        req.setAgreeProtocol(true);

        WechatLoginVO vo = authService.phoneLogin(req);

        assertThat(vo.getUserId()).isEqualTo(9L);
        assertThat(vo.getMaskedPhone()).isEqualTo("138****8000");
        verify(redisTemplate).delete("miniapp:auth:sms:code:13800138000");
    }

    private AppConfig config(String value) {
        AppConfig config = new AppConfig();
        config.setConfigKey("prd01.security.sms.rules");
        config.setConfigValue(value);
        config.setConfigGroup("PRD01_AUDIT");
        return config;
    }
}
