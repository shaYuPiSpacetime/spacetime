package com.spacetime.miniapp.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.dao.AppConfigDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.UserAssetDao;
import com.spacetime.common.entity.AppConfig;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.common.provider.SmsCodeProvider;
import com.spacetime.common.service.AppUserAuditContentService;
import com.spacetime.common.service.PromotionEventInboxService;
import com.spacetime.miniapp.dto.request.PhoneLoginReq;
import com.spacetime.miniapp.dto.request.PhoneSmsCodeReq;
import com.spacetime.miniapp.dto.response.PhoneSmsCodeVO;
import com.spacetime.miniapp.dto.response.AccessStatusVO;
import com.spacetime.miniapp.dto.response.WechatLoginVO;
import com.spacetime.miniapp.service.impl.AuthMiniappServiceImpl;
import com.spacetime.miniapp.service.impl.Prd01AccessEvaluator;
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
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("Miniapp phone login SMS code")
class AuthMiniappServiceImplTest {

    @Mock
    private AppUserDao appUserDao;
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
    @Mock
    private Prd01AccessEvaluator accessEvaluator;
    @Mock
    private UserAssetDao userAssetDao;
    @Mock
    private PromotionEventInboxService promotionEventInboxService;

    private AuthMiniappServiceImpl authService;

    @BeforeEach
    void setUp() {
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        when(smsCodeProvider.providerCode()).thenReturn("MOCK");
        when(smsCodeProvider.generateCode()).thenReturn("000000");
        when(accessEvaluator.evaluate(any(AppUser.class))).thenReturn(new AccessStatusVO());
        when(appConfigDao.selectByKey("prd01.security.sms.rules")).thenReturn(config(
                "{\"rows\":[{\"key\":\"sendCountdownSeconds\",\"value\":\"45\"},{\"key\":\"validMinutes\",\"value\":\"3\"},{\"key\":\"dailySendLimit\",\"value\":\"8\"}]}"));
        authService = new AuthMiniappServiceImpl(
                appUserDao,
                auditContentService,
                redisTemplate,
                objectMapper,
                wechatMiniappClient,
                appConfigDao,
                smsCodeProvider,
                new Prd01FieldConfigResolver(appConfigDao, objectMapper),
                accessEvaluator,
                userAssetDao,
                promotionEventInboxService);
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
    @DisplayName("发送验证码兼容 Redis JSON 序列化的带引号每日次数")
    void shouldParseJsonSerializedDailySmsCount() {
        when(valueOps.get(anyString())).thenReturn("\"2\"");

        PhoneSmsCodeReq req = new PhoneSmsCodeReq();
        req.setPhone("13800138000");
        PhoneSmsCodeVO vo = authService.sendPhoneSmsCode(req);

        assertThat(vo.getDailyRemaining()).isEqualTo(5);
        verify(valueOps).set(argThat(key -> key.startsWith("miniapp:auth:sms:daily:")), eq("3"), any(Duration.class));
    }

    @Test
    @DisplayName("短信三方发送失败时不得写入验证码、倒计时或每日次数")
    void shouldNotPersistCodeWhenProviderFails() {
        when(valueOps.get(anyString())).thenReturn(null);
        doThrow(new IllegalStateException("短信网关失败"))
                .when(smsCodeProvider).sendLoginCode("13800138000", "000000", 3);

        PhoneSmsCodeReq req = new PhoneSmsCodeReq();
        req.setPhone("13800138000");

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> authService.sendPhoneSmsCode(req))
                .hasMessageContaining("AUTH_SMS_SEND_FAILED");
        verify(valueOps, never()).set(eq("miniapp:auth:sms:code:13800138000"), anyString(), any(Duration.class));
        verify(valueOps, never()).set(eq("miniapp:auth:sms:cooldown:13800138000"), anyString(), any(Duration.class));
        verify(valueOps, never()).set(argThat(key -> key.startsWith("miniapp:auth:sms:daily:")), anyString(), any(Duration.class));
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
        when(appUserDao.selectByPhoneHash(anyString())).thenReturn(user);

        PhoneLoginReq req = new PhoneLoginReq();
        req.setPhone("13800138000");
        req.setSmsCode("000000");
        req.setAgreeProtocol(true);

        WechatLoginVO vo = authService.phoneLogin(req);

        assertThat(vo.getUserId()).isEqualTo(9L);
        assertThat(vo.getMaskedPhone()).isEqualTo("138****8000");
        verify(redisTemplate).delete("miniapp:auth:sms:code:13800138000");
    }

    @Test
    @DisplayName("兼容 Redis JSON 序列化产生的带引号验证码")
    void shouldLoginWithJsonSerializedStoredSmsCode() {
        when(valueOps.get("miniapp:auth:sms:code:13800138000")).thenReturn("\"000000\"");
        AppUser user = new AppUser();
        user.setId(10L);
        user.setOpenid("phone_13800138000");
        user.setPhone("13800138000");
        user.setAccountStatus(AccountStatusEnum.NORMAL.getCode());
        user.setFirstLoginCompleted(0);
        when(appUserDao.selectByPhoneHash(anyString())).thenReturn(user);

        PhoneLoginReq req = new PhoneLoginReq();
        req.setPhone("13800138000");
        req.setSmsCode("000000");
        req.setAgreeProtocol(true);

        WechatLoginVO vo = authService.phoneLogin(req);

        assertThat(vo.getUserId()).isEqualTo(10L);
        verify(redisTemplate).delete("miniapp:auth:sms:code:13800138000");
    }

    @Test
    @DisplayName("手机号登录复用同手机号的微信账号且不覆盖微信 openid")
    void shouldReuseWechatAccountWithSamePhone() {
        when(valueOps.get("miniapp:auth:sms:code:13800138000")).thenReturn("000000");
        AppUser user = new AppUser();
        user.setId(50L);
        user.setOpenid("wechat_openid_existing");
        user.setPhone("13800138000");
        user.setAccountStatus(AccountStatusEnum.NORMAL.getCode());
        user.setFirstLoginCompleted(0);
        when(appUserDao.selectByPhoneHash(anyString())).thenReturn(user);

        PhoneLoginReq req = new PhoneLoginReq();
        req.setPhone("13800138000");
        req.setSmsCode("000000");
        req.setAgreeProtocol(true);

        WechatLoginVO vo = authService.phoneLogin(req);

        assertThat(vo.getUserId()).isEqualTo(50L);
        assertThat(vo.getOpenid()).isEqualTo("wechat_openid_existing");
        assertThat(vo.getIsNewUser()).isFalse();
        verify(appUserDao).updateById(user);
        verify(appUserDao, never()).insert(any(AppUser.class));
        verify(userAssetDao, never()).insert(any());
        verify(redisTemplate).delete("miniapp:auth:sms:code:13800138000");
    }

    @Test
    @DisplayName("手机号账号查询异常时不提前消费验证码")
    void shouldKeepSmsCodeWhenAccountLoginFails() {
        when(valueOps.get("miniapp:auth:sms:code:13800138000")).thenReturn("000000");
        doThrow(new IllegalStateException("数据库查询失败"))
                .when(appUserDao).selectByPhoneHash(anyString());

        PhoneLoginReq req = new PhoneLoginReq();
        req.setPhone("13800138000");
        req.setSmsCode("000000");
        req.setAgreeProtocol(true);

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> authService.phoneLogin(req))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("数据库查询失败");
        verify(redisTemplate, never()).delete("miniapp:auth:sms:code:13800138000");
    }

    private AppConfig config(String value) {
        AppConfig config = new AppConfig();
        config.setConfigKey("prd01.security.sms.rules");
        config.setConfigValue(value);
        config.setConfigGroup("PRD01_AUDIT");
        return config;
    }
}
