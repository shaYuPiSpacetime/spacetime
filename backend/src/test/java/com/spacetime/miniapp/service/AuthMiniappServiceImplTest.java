package com.spacetime.miniapp.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.dao.AppConfigDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.UserAssetDao;
import com.spacetime.common.entity.AppConfig;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.common.service.AppUserAuditContentService;
import com.spacetime.common.service.PromotionEventInboxService;
import com.spacetime.common.provider.SmsCodeProvider;
import com.spacetime.miniapp.dto.request.PhoneLoginReq;
import com.spacetime.miniapp.dto.request.PhoneSmsCodeReq;
import com.spacetime.miniapp.dto.request.WechatLoginReq;
import com.spacetime.miniapp.dto.request.WechatUsageReq;
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
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Duration;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verifyNoInteractions;

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
    private Prd01AccessEvaluator accessEvaluator;
    @Mock
    private UserAssetDao userAssetDao;
    @Mock
    private PromotionEventInboxService promotionEventInboxService;
    @Mock
    private SmsCodeProvider smsCodeProvider;

    private AuthMiniappServiceImpl authService;

    @BeforeEach
    void setUp() {
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        when(valueOps.get("miniapp:auth:sms:code:13800138000")).thenReturn("0000");
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
                new Prd01FieldConfigResolver(appConfigDao, objectMapper),
                accessEvaluator,
                userAssetDao,
                promotionEventInboxService,
                smsCodeProvider);
    }

    @Test
    @DisplayName("立即使用首次建号保留校园代理追踪号")
    void shouldKeepPromotionTracesWhenWechatUsageCreatesUser() throws Exception {
        WechatUsageReq req = objectMapper.readValue(
                "{\"loginCode\":\"usage-code\",\"promotionTraceNos\":[\"TRC-agent12345678\"]}",
                WechatUsageReq.class);
        stubNewWechatUsageUser();

        var result = authService.resolveWechatUsage(req);

        assertThat(result.getProvisionalLogin().getIsNewUser()).isTrue();
        verify(promotionEventInboxService).enqueueRegister(233L, List.of("TRC-agent12345678"));
    }

    @Test
    @DisplayName("已有微信账号携带推广来源不重新注册归因")
    void shouldNotAttributeExistingWechatUsageUser() throws Exception {
        WechatUsageReq req = objectMapper.readValue(
                "{\"loginCode\":\"usage-code\",\"promotionTraceNos\":[\"TRC-agent12345678\"]}",
                WechatUsageReq.class);
        when(wechatMiniappClient.code2Session("usage-code"))
                .thenReturn(new WechatMiniappClient.SessionInfo("usage-openid", null));
        AppUser user = new AppUser();
        user.setId(233L);
        user.setNickname("已有用户");
        user.setAccountStatus(AccountStatusEnum.NORMAL.getCode());
        when(appUserDao.selectOne(any())).thenReturn(user);

        var result = authService.resolveWechatUsage(req);

        assertThat(result.getProvisionalLogin().getIsNewUser()).isFalse();
        verify(appUserDao, never()).insert(any(AppUser.class));
        verifyNoInteractions(promotionEventInboxService);
    }

    @Test
    @DisplayName("无推广来源的立即使用兼容旧请求")
    void shouldCreateWechatUsageUserWithoutPromotionSource() throws Exception {
        WechatUsageReq req = objectMapper.readValue("{\"loginCode\":\"usage-code\"}", WechatUsageReq.class);
        stubNewWechatUsageUser();

        var result = authService.resolveWechatUsage(req);

        assertThat(result.getProvisionalLogin().getUserId()).isEqualTo(233L);
        verify(promotionEventInboxService).enqueueRegister(eq(233L), any());
    }

    private void stubNewWechatUsageUser() {
        when(wechatMiniappClient.code2Session("usage-code"))
                .thenReturn(new WechatMiniappClient.SessionInfo("usage-openid", null));
        doAnswer(invocation -> {
            AppUser user = invocation.getArgument(0);
            user.setId(233L);
            return null;
        }).when(appUserDao).insert(any(AppUser.class));
    }

    @Test
    @DisplayName("获取验证码固定写入 0000")
    void shouldIssueFixedCode() {
        when(valueOps.get(anyString())).thenReturn(null);

        PhoneSmsCodeReq req = new PhoneSmsCodeReq();
        req.setPhone("13800138000");
        PhoneSmsCodeVO vo = authService.sendPhoneSmsCode(req);

        assertThat(vo.getProviderCode()).isEqualTo("FIXED");
        verify(valueOps).set("miniapp:auth:sms:code:13800138000", "0000", Duration.ofMinutes(3));
        verifyNoInteractions(smsCodeProvider);
    }

    @Test
    @DisplayName("Redis 中的有效验证码可以完成登录")
    void shouldLoginWithCachedCode() {
        when(valueOps.get("miniapp:auth:sms:code:13800138000")).thenReturn("0000");
        AppUser user = new AppUser();
        user.setId(11L);
        user.setOpenid("phone_13800138000");
        user.setPhone("13800138000");
        user.setAccountStatus(AccountStatusEnum.NORMAL.getCode());
        user.setFirstLoginCompleted(0);
        when(appUserDao.selectByPhoneHash(anyString())).thenReturn(user);

        PhoneLoginReq req = new PhoneLoginReq();
        req.setPhone("13800138000");
        req.setSmsCode("0000");
        req.setAgreeProtocol(true);

        WechatLoginVO vo = authService.phoneLogin(req);

        assertThat(vo.getUserId()).isEqualTo(11L);
        verify(redisTemplate).delete("miniapp:auth:sms:code:13800138000");
    }

    @Test
    @DisplayName("与 Redis 不匹配的验证码必须拒绝登录")
    void shouldRejectMismatchedCode() {
        PhoneLoginReq req = new PhoneLoginReq();
        req.setPhone("13800138000");
        req.setSmsCode("1234");
        when(valueOps.get("miniapp:auth:sms:code:13800138000")).thenReturn("0000");
        req.setAgreeProtocol(true);

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> authService.phoneLogin(req))
                .hasMessageContaining("AUTH_SMS_INVALID");
        verify(appUserDao, never()).selectByPhoneHash(anyString());
    }

    @Test
    @DisplayName("未获取或已过期的固定验证码拒绝登录")
    void shouldRejectFixedCodeWithoutCachedCode() {
        when(valueOps.get("miniapp:auth:sms:code:13800138000")).thenReturn(null);
        PhoneLoginReq req = new PhoneLoginReq();
        req.setPhone("13800138000");
        req.setSmsCode("0000");
        req.setAgreeProtocol(true);

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> authService.phoneLogin(req))
                .hasMessageContaining("AUTH_SMS_INVALID");
        verifyNoInteractions(appUserDao);
    }

    @Test
    @DisplayName("旧随机验证码即使匹配缓存也不能登录")
    void shouldRejectLegacyRandomCode() {
        when(valueOps.get("miniapp:auth:sms:code:13800138000")).thenReturn("654321");
        PhoneLoginReq req = new PhoneLoginReq();
        req.setPhone("13800138000");
        req.setSmsCode("654321");
        req.setAgreeProtocol(true);

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> authService.phoneLogin(req))
                .hasMessageContaining("AUTH_SMS_INVALID");
        req.setSmsCode("0000");
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> authService.phoneLogin(req))
                .hasMessageContaining("AUTH_SMS_INVALID");
        verifyNoInteractions(appUserDao);
    }

    @Test
    @DisplayName("获取后固定验证码只能登录一次")
    void shouldConsumeIssuedFixedCodeOnce() {
        java.util.Map<String, String> cache = new java.util.HashMap<>();
        when(valueOps.get(anyString())).thenAnswer(invocation -> cache.get(invocation.getArgument(0)));
        doAnswer(invocation -> {
            cache.put(invocation.getArgument(0), invocation.getArgument(1));
            return null;
        }).when(valueOps).set(anyString(), anyString(), any(Duration.class));
        when(redisTemplate.delete(anyString())).thenAnswer(invocation ->
                cache.remove(invocation.getArgument(0)) != null);
        AppUser user = new AppUser();
        user.setId(11L);
        user.setOpenid("phone_13800138000");
        user.setAccountStatus(AccountStatusEnum.NORMAL.getCode());
        when(appUserDao.selectByPhoneHash(anyString())).thenReturn(user);
        PhoneSmsCodeReq smsReq = new PhoneSmsCodeReq();
        smsReq.setPhone("13800138000");
        authService.sendPhoneSmsCode(smsReq);
        PhoneLoginReq req = new PhoneLoginReq();
        req.setPhone("13800138000");
        req.setSmsCode("0000");
        req.setAgreeProtocol(true);

        assertThat(authService.phoneLogin(req).getUserId()).isEqualTo(11L);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> authService.phoneLogin(req))
                .hasMessageContaining("AUTH_SMS_INVALID");
        verify(appUserDao).selectByPhoneHash(anyString());
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
        assertThat(vo.getProviderCode()).isEqualTo("FIXED");
        verify(valueOps).set("miniapp:auth:sms:code:13800138000", "0000", Duration.ofMinutes(3));
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
    @DisplayName("手机号登录接受缓存验证码并在成功后清理")
    void shouldLoginWithCachedSmsCodeAndClearCachedCode() {
        AppUser user = new AppUser();
        user.setId(9L);
        user.setOpenid("phone_13800138000");
        user.setPhone("13800138000");
        user.setAccountStatus(AccountStatusEnum.NORMAL.getCode());
        user.setFirstLoginCompleted(0);
        when(appUserDao.selectByPhoneHash(anyString())).thenReturn(user);

        PhoneLoginReq req = new PhoneLoginReq();
        req.setPhone("13800138000");
        req.setSmsCode("0000");
        req.setAgreeProtocol(true);

        WechatLoginVO vo = authService.phoneLogin(req);

        assertThat(vo.getUserId()).isEqualTo(9L);
        assertThat(vo.getNickname()).isEqualTo("用户0009");
        assertThat(user.getNickname()).isEqualTo("用户0009");
        assertThat(vo.getMaskedPhone()).isEqualTo("138****8000");
        verify(redisTemplate).delete("miniapp:auth:sms:code:13800138000");
    }

    @Test
    @DisplayName("手机号登录复用同手机号的微信账号且不覆盖微信 openid")
    void shouldReuseWechatAccountWithSamePhone() {
        AppUser user = new AppUser();
        user.setId(50L);
        user.setOpenid("wechat_openid_existing");
        user.setPhone("13800138000");
        user.setAccountStatus(AccountStatusEnum.NORMAL.getCode());
        user.setFirstLoginCompleted(0);
        when(appUserDao.selectByPhoneHash(anyString())).thenReturn(user);

        PhoneLoginReq req = new PhoneLoginReq();
        req.setPhone("13800138000");
        req.setSmsCode("0000");
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
        doThrow(new IllegalStateException("数据库查询失败"))
                .when(appUserDao).selectByPhoneHash(anyString());

        PhoneLoginReq req = new PhoneLoginReq();
        req.setPhone("13800138000");
        req.setSmsCode("0000");
        req.setAgreeProtocol(true);

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> authService.phoneLogin(req))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("数据库查询失败");
        verify(redisTemplate, never()).delete("miniapp:auth:sms:code:13800138000");
    }

    @Test
    @DisplayName("微信临时账号授权已有手机号时复用手机号账号并迁移微信身份")
    void shouldReusePhoneOwnerWhenProvisionalWechatAccountBindsExistingPhone() {
        AppUser provisionalUser = new AppUser();
        provisionalUser.setId(233L);
        provisionalUser.setOpenid("wechat_openid_current");
        provisionalUser.setUnionid("wechat_unionid_current");
        provisionalUser.setAccountStatus(AccountStatusEnum.NORMAL.getCode());
        provisionalUser.setFirstLoginCompleted(1);

        AppUser phoneOwner = new AppUser();
        phoneOwner.setId(204L);
        phoneOwner.setOpenid("phone_13800138000");
        phoneOwner.setPhone("13800138000");
        phoneOwner.setPhoneHash("existing_phone_hash");
        phoneOwner.setAccountStatus(AccountStatusEnum.NORMAL.getCode());
        phoneOwner.setFirstLoginCompleted(1);

        when(wechatMiniappClient.code2Session("login-code"))
                .thenReturn(new WechatMiniappClient.SessionInfo(
                        "wechat_openid_current", "wechat_unionid_current"));
        when(wechatMiniappClient.getPhoneNumber("phone-code"))
                .thenReturn(new WechatMiniappClient.PhoneInfo(
                        "13800138000", "13800138000", "86"));
        when(appUserDao.selectOne(any())).thenReturn(provisionalUser);
        when(appUserDao.selectByPhoneHash(anyString())).thenReturn(phoneOwner);

        WechatLoginReq req = new WechatLoginReq();
        req.setLoginCode("login-code");
        req.setPhoneCode("phone-code");
        req.setAgreeProtocol(true);

        WechatLoginVO vo = authService.wechatLogin(req);

        assertThat(vo.getUserId()).isEqualTo(204L);
        assertThat(vo.getOpenid()).isEqualTo("wechat_openid_current");
        assertThat(phoneOwner.getUnionid()).isEqualTo("wechat_unionid_current");
        assertThat(provisionalUser.getOpenid()).startsWith("phone_migrated_");
        assertThat(provisionalUser.getUnionid()).isEmpty();
        verify(appUserDao).updateById(provisionalUser);
        verify(appUserDao).updateById(phoneOwner);
    }

    @Test
    @DisplayName("手机号已绑定其他真实微信时拒绝迁移微信身份")
    void shouldRejectWechatIdentityMigrationWhenPhoneOwnerHasRealWechatIdentity() {
        AppUser provisionalUser = new AppUser();
        provisionalUser.setId(233L);
        provisionalUser.setOpenid("wechat_openid_current");
        provisionalUser.setAccountStatus(AccountStatusEnum.NORMAL.getCode());
        provisionalUser.setFirstLoginCompleted(1);

        AppUser phoneOwner = new AppUser();
        phoneOwner.setId(204L);
        phoneOwner.setOpenid("wechat_openid_other");
        phoneOwner.setPhone("13800138000");
        phoneOwner.setPhoneHash("existing_phone_hash");
        phoneOwner.setAccountStatus(AccountStatusEnum.NORMAL.getCode());
        phoneOwner.setFirstLoginCompleted(1);

        when(wechatMiniappClient.code2Session("login-code"))
                .thenReturn(new WechatMiniappClient.SessionInfo("wechat_openid_current", null));
        when(wechatMiniappClient.getPhoneNumber("phone-code"))
                .thenReturn(new WechatMiniappClient.PhoneInfo(
                        "13800138000", "13800138000", "86"));
        when(appUserDao.selectOne(any())).thenReturn(provisionalUser);
        when(appUserDao.selectByPhoneHash(anyString())).thenReturn(phoneOwner);

        WechatLoginReq req = new WechatLoginReq();
        req.setLoginCode("login-code");
        req.setPhoneCode("phone-code");
        req.setAgreeProtocol(true);

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> authService.wechatLogin(req))
                .hasMessageContaining("手机号已绑定其他微信账号");
        verify(appUserDao, never()).updateById(any(AppUser.class));
    }

    @Test
    @DisplayName("关闭 mock 后真实发送随机码，并缓存到真实模式命名空间")
    void realModeShouldSendAndCacheProviderCode() {
        enableRealSms();
        PhoneSmsCodeVO result = authService.sendPhoneSmsCode(smsRequest());

        assertThat(result.getProviderCode()).isEqualTo("ALIYUN_SMS");
        assertThat(result.getDailyRemaining()).isEqualTo(7);
        verify(smsCodeProvider).sendLoginCode("13800138000", "4826", 3);
        verify(valueOps).set("miniapp:auth:sms:real:code:13800138000", "4826", Duration.ofMinutes(3));
        verify(valueOps, never()).set(eq("miniapp:auth:sms:code:13800138000"), anyString(), any(Duration.class));
    }

    @Test
    @DisplayName("真实发送失败不发放验证码、不计发送次数、不降级 mock")
    void realSendFailureShouldNotIssueCodeOrConsumeSendLimit() {
        enableRealSms();
        doThrow(new IllegalStateException("provider failed"))
                .when(smsCodeProvider).sendLoginCode("13800138000", "4826", 3);

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> authService.sendPhoneSmsCode(smsRequest()))
                .hasMessageContaining("AUTH_SMS_SEND_FAILED");

        verify(valueOps, never()).set(anyString(), anyString(), any(Duration.class));
        verifyNoInteractions(appUserDao);
    }

    @Test
    @DisplayName("关闭 mock 后配置 MOCK Provider 必须拒绝发放验证码")
    void realModeShouldRejectMockProvider() {
        enableRealSms();
        when(smsCodeProvider.providerCode()).thenReturn("MOCK");

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> authService.sendPhoneSmsCode(smsRequest()))
                .hasMessageContaining("AUTH_SMS_PROVIDER_UNAVAILABLE");

        verify(smsCodeProvider, never()).generateCode();
        verify(smsCodeProvider, never()).sendLoginCode(anyString(), anyString(), org.mockito.ArgumentMatchers.anyInt());
        verify(valueOps, never()).set(anyString(), anyString(), any(Duration.class));
    }

    @Test
    @DisplayName("关闭 mock 后旧固定验证码缓存不能登录")
    void realModeShouldNotAcceptPreviouslyIssuedMockCode() {
        enableRealSms();
        // setUp 已在旧命名空间保留 0000，但真实命名空间尚未获取验证码。
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> authService.phoneLogin(phoneRequest("0000")))
                .hasMessageContaining("AUTH_SMS_INVALID");

        verify(valueOps).get("miniapp:auth:sms:real:code:13800138000");
        verify(valueOps, never()).get("miniapp:auth:sms:code:13800138000");
        verifyNoInteractions(appUserDao);
    }

    @Test
    @DisplayName("真实模式使用匹配缓存的随机码登录并消费，兼容 Redis JSON 标量")
    void realModeShouldLoginWithCachedRandomCode() {
        enableRealSms();
        when(valueOps.get("miniapp:auth:sms:real:code:13800138000")).thenReturn("\"4826\"");
        stubExistingPhoneUser();

        assertThat(authService.phoneLogin(phoneRequest("4826")).getUserId()).isEqualTo(11L);
        verify(redisTemplate).delete("miniapp:auth:sms:real:code:13800138000");
        verify(redisTemplate, never()).delete("miniapp:auth:sms:code:13800138000");
    }

    @Test
    @DisplayName("真实模式只接受匹配的当前随机码，固定 0000 不绕过验证")
    void realModeShouldRejectMismatchedOrExpiredCode() {
        enableRealSms();
        when(valueOps.get("miniapp:auth:sms:real:code:13800138000")).thenReturn("4826", null);

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> authService.phoneLogin(phoneRequest("0000")))
                .hasMessageContaining("AUTH_SMS_INVALID");
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> authService.phoneLogin(phoneRequest("4826")))
                .hasMessageContaining("AUTH_SMS_INVALID");
        verifyNoInteractions(appUserDao);
    }

    @Test
    @DisplayName("切回 mock 模式后不接受真实模式验证码")
    void mockModeShouldNotAcceptPreviouslyIssuedRealCode() {
        when(valueOps.get("miniapp:auth:sms:code:13800138000")).thenReturn(null);
        when(valueOps.get("miniapp:auth:sms:real:code:13800138000")).thenReturn("4826");

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> authService.phoneLogin(phoneRequest("4826")))
                .hasMessageContaining("AUTH_SMS_INVALID");
        verify(valueOps, never()).get("miniapp:auth:sms:real:code:13800138000");
        verifyNoInteractions(appUserDao);
    }

    @Test
    @DisplayName("真实短信验证码成功登录后只能使用一次")
    void realModeShouldConsumeIssuedCodeOnce() {
        enableRealSms();
        java.util.Map<String, String> cache = new java.util.HashMap<>();
        when(valueOps.get(anyString())).thenAnswer(invocation -> cache.get(invocation.getArgument(0)));
        doAnswer(invocation -> {
            cache.put(invocation.getArgument(0), invocation.getArgument(1));
            return null;
        }).when(valueOps).set(anyString(), anyString(), any(Duration.class));
        when(redisTemplate.delete(anyString())).thenAnswer(invocation -> cache.remove(invocation.getArgument(0)) != null);
        stubExistingPhoneUser();
        authService.sendPhoneSmsCode(smsRequest());

        assertThat(authService.phoneLogin(phoneRequest("4826")).getUserId()).isEqualTo(11L);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> authService.phoneLogin(phoneRequest("4826")))
                .hasMessageContaining("AUTH_SMS_INVALID");
        verify(appUserDao).selectByPhoneHash(anyString());
    }

    private void enableRealSms() {
        ReflectionTestUtils.setField(authService, "smsMockEnabled", false);
        when(smsCodeProvider.providerCode()).thenReturn("ALIYUN_SMS");
        when(smsCodeProvider.generateCode()).thenReturn("4826");
    }

    private PhoneSmsCodeReq smsRequest() {
        PhoneSmsCodeReq req = new PhoneSmsCodeReq();
        req.setPhone("13800138000");
        return req;
    }

    private PhoneLoginReq phoneRequest(String code) {
        PhoneLoginReq req = new PhoneLoginReq();
        req.setPhone("13800138000");
        req.setSmsCode(code);
        req.setAgreeProtocol(true);
        return req;
    }

    private void stubExistingPhoneUser() {
        AppUser user = new AppUser();
        user.setId(11L);
        user.setOpenid("phone_13800138000");
        user.setAccountStatus(AccountStatusEnum.NORMAL.getCode());
        when(appUserDao.selectByPhoneHash(anyString())).thenReturn(user);
    }

    private AppConfig config(String value) {
        AppConfig config = new AppConfig();
        config.setConfigKey("prd01.security.sms.rules");
        config.setConfigValue(value);
        config.setConfigGroup("PRD01_AUDIT");
        return config;
    }
}
