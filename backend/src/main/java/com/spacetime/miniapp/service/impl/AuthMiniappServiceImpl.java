package com.spacetime.miniapp.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.constant.AuthConstant;
import com.spacetime.common.dao.AppConfigDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.UserAssetDao;
import com.spacetime.common.entity.AppConfig;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.UserAsset;
import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.common.enums.RegisterSourceEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.service.AppUserAuditContentService;
import com.spacetime.common.service.PromotionEventInboxService;
import com.spacetime.common.util.DefaultNicknameGenerator;
import com.spacetime.miniapp.dto.request.PhoneLoginReq;
import com.spacetime.miniapp.dto.request.PhoneSmsCodeReq;
import com.spacetime.miniapp.dto.request.WechatLoginReq;
import com.spacetime.miniapp.dto.request.WechatUsageReq;
import com.spacetime.miniapp.dto.response.PhoneSmsCodeVO;
import com.spacetime.miniapp.dto.response.WechatLoginVO;
import com.spacetime.miniapp.dto.response.WechatUsageVO;
import com.spacetime.miniapp.service.AuthMiniappService;
import com.spacetime.miniapp.service.WechatMiniappClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HexFormat;
import java.util.UUID;
import java.util.List;
import java.math.BigDecimal;
import com.spacetime.common.enums.VipStatusEnum;

/**
 * 小程序登录服务实现。
 *
 * 微信登录和手机号登录共用同一响应结构，移动端可以统一处理首登续填、
 * 核心准入拦截和后续跳转。当前无生产环境，手机号验证码固定为 0000，
 * 发送接口仅保留 Redis 频控，不调用短信网关。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthMiniappServiceImpl implements AuthMiniappService {

    private static final String SMS_RULES_KEY = "prd01.security.sms.rules";
    private static final String SMS_CODE_PREFIX = "miniapp:auth:sms:code:";
    private static final String SMS_COOLDOWN_PREFIX = "miniapp:auth:sms:cooldown:";
    private static final String SMS_DAILY_PREFIX = "miniapp:auth:sms:daily:";
    private static final String FIXED_SMS_CODE = "0000";

    private final AppUserDao appUserDao;
    private final AppUserAuditContentService auditContentService;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final WechatMiniappClient wechatMiniappClient;
    private final AppConfigDao appConfigDao;
    private final Prd01FieldConfigResolver fieldConfigResolver;
    private final Prd01AccessEvaluator accessEvaluator;
    private final UserAssetDao userAssetDao;
    private final PromotionEventInboxService promotionEventInboxService;

    /** 微信授权手机号登录。 */
    @Override
    @Transactional
    public WechatLoginVO wechatLogin(WechatLoginReq req) {
        requireProtocolAgreement(req.getAgreeProtocol());
        String loginCode = normalizeLoginCode(req);
        WechatMiniappClient.SessionInfo session = wechatMiniappClient.code2Session(loginCode);
        if (session == null || StrUtil.isBlank(session.openid())) {
            throw new BusinessException("微信登录失败，请重试");
        }
        WechatMiniappClient.PhoneInfo phoneInfo = wechatMiniappClient.getPhoneNumber(req.getPhoneCode());
        String phone = normalizePhone(phoneInfo);
        LoginTarget target = loginByOpenId(
                session.openid(), RegisterSourceEnum.WECHAT.getCode(), phone, session.unionid(),
                req.getPromotionTraceNos());
        return buildLoginVO(target.user(), target.isNew());
    }

    /** 发送手机号登录验证码，倒计时、有效期、每日次数均读取后台安全策略配置。 */
    @Override
    public PhoneSmsCodeVO sendPhoneSmsCode(PhoneSmsCodeReq req) {
        SmsRules rules = loadSmsRules();
        String phone = req.getPhone().trim();
        String cooldownKey = SMS_COOLDOWN_PREFIX + phone;
        if (Boolean.TRUE.equals(redisTemplate.hasKey(cooldownKey))) {
            throw new BusinessException("AUTH_SMS_COOLDOWN: 请稍后再获取验证码");
        }

        String dailyKey = dailyKey(phone);
        int usedCount = parseInt(redisTemplate.opsForValue().get(dailyKey), 0);
        if (usedCount >= rules.dailySendLimit()) {
            throw new BusinessException("AUTH_SMS_DAILY_LIMIT: 今日验证码次数已达上限");
        }

        String code = FIXED_SMS_CODE;

        redisTemplate.opsForValue().set(SMS_CODE_PREFIX + phone, code, Duration.ofMinutes(rules.validMinutes()));
        redisTemplate.opsForValue().set(cooldownKey, "1", Duration.ofSeconds(rules.sendCountdownSeconds()));
        redisTemplate.opsForValue().set(dailyKey, String.valueOf(usedCount + 1), secondsUntilTomorrow());

        PhoneSmsCodeVO vo = new PhoneSmsCodeVO();
        vo.setCountdownSeconds(rules.sendCountdownSeconds());
        vo.setValidMinutes(rules.validMinutes());
        vo.setDailyLimit(rules.dailySendLimit());
        vo.setDailyRemaining(Math.max(0, rules.dailySendLimit() - usedCount - 1));
        vo.setProviderCode("FIXED");
        return vo;
    }

    /** 手机号验证码登录。 */
    @Override
    @Transactional
    public WechatLoginVO phoneLogin(PhoneLoginReq req) {
        requireProtocolAgreement(req.getAgreeProtocol());
        String phone = req.getPhone().trim();
        String codeKey = SMS_CODE_PREFIX + phone;
        String submittedCode = req.getSmsCode().trim();
        if (!FIXED_SMS_CODE.equals(submittedCode)) {
            throw new BusinessException("AUTH_SMS_INVALID: 验证码错误或已过期");
        }
        LoginTarget target = loginByPhone(phone, req.getPromotionTraceNos());
        WechatLoginVO vo = buildLoginVO(target.user(), target.isNew());
        redisTemplate.delete(codeKey);
        return vo;
    }

    /**
     * 按手机号登录；已有微信账号时复用原账号和 openid，避免同一手机号重复注册。
     */
    private LoginTarget loginByPhone(String phone, List<String> promotionTraceNos) {
        String phoneHash = hashPhone(phone);
        AppUser user = appUserDao.selectByPhoneHash(phoneHash);
        if (user == null) {
            return loginByOpenId(
                    "phone_" + phone,
                    RegisterSourceEnum.PHONE.getCode(),
                    phone,
                    null,
                    promotionTraceNos);
        }
        checkAccountStatus(user);
        user.setPhone(phone);
        user.setPhoneHash(phoneHash);
        ensureDefaultNickname(user);
        user.setLastLoginTime(LocalDateTime.now());
        appUserDao.updateById(user);
        return new LoginTarget(user, false);
    }

    /**
     * 按 openId 登录或创建用户。
     *
     * 新手机号账号使用 openId 字段保存 phone_手机号；本期不在登录时生成认证审核记录。
     */
    private LoginTarget loginByOpenId(String openId,
                                      String registerSource,
                                      String boundPhone,
                                      String unionid,
                                      List<String> promotionTraceNos) {
        AppUser user = findWechatUser(openId, unionid);
        boolean isNew = user == null;
        if (isNew) {
            LoginTarget created = createNewUser(
                    openId, registerSource, boundPhone, unionid, promotionTraceNos);
            user = created.user();
        } else {
            checkAccountStatus(user);
            ensureDefaultNickname(user);
            if (StrUtil.isNotBlank(unionid)) {
                user.setUnionid(unionid);
            }
            if (StrUtil.isNotBlank(boundPhone)) {
                user.setPhone(boundPhone);
                user.setPhoneHash(hashPhone(boundPhone));
            }
            user.setLastLoginTime(LocalDateTime.now());
            appUserDao.updateById(user);
        }
        return new LoginTarget(user, isNew);
    }

    /** unionId 可用时优先跨 openId 识别同一微信用户，缺失时回退当前小程序 openId。 */
    private AppUser findWechatUser(String openId, String unionid) {
        if (StrUtil.isNotBlank(unionid)) {
            AppUser byUnionId = appUserDao.selectOne(
                    new LambdaQueryWrapper<AppUser>().eq(AppUser::getUnionid, unionid));
            if (byUnionId != null) return byUnionId;
        }
        return appUserDao.selectOne(new LambdaQueryWrapper<AppUser>().eq(AppUser::getOpenid, openId));
    }

    /** 创建用户；认证记录按用户后续真实提交生成，不在登录时默认落库。 */
    private LoginTarget createNewUser(String openId,
                                      String registerSource,
                                      String boundPhone,
                                      String unionid,
                                      List<String> promotionTraceNos) {
        AppUser user = new AppUser();
        user.setOpenid(openId);
        user.setUnionid(unionid);
        user.setPhone(boundPhone);
        if (StrUtil.isNotBlank(boundPhone)) {
            user.setPhoneHash(hashPhone(boundPhone));
        }
        user.setRegisterSource(registerSource);
        user.setRegisterTime(LocalDateTime.now());
        user.setLastLoginTime(LocalDateTime.now());
        user.setAccountStatus(AccountStatusEnum.NORMAL.getCode());
        user.setFirstLoginCompleted(0);
        user.setFirstLoginNextStep(fieldConfigResolver.nextVisibleStep(1));
        appUserDao.insert(user);
        ensureDefaultNickname(user);
        appUserDao.updateById(user);
        UserAsset asset = new UserAsset();
        asset.setUserId(user.getId());
        asset.setVipStatus(VipStatusEnum.INACTIVE.getCode());
        asset.setCoinBalance(0);
        asset.setTodayFreeWhisperRemain(0);
        asset.setTotalRecharge(BigDecimal.ZERO);
        userAssetDao.insert(asset);
        promotionEventInboxService.enqueueRegister(user.getId(), promotionTraceNos);
        return new LoginTarget(user, true);
    }

    /** 历史空昵称账号登录时就地补齐，避免资料页和用户卡片继续展示空白。 */
    private void ensureDefaultNickname(AppUser user) {
        if (StrUtil.isBlank(user.getNickname())) {
            user.setNickname(DefaultNicknameGenerator.fromUserId(user.getId()));
        }
    }

    /** 冻结或注销账号不允许登录。 */
    private void checkAccountStatus(AppUser user) {
        if (AccountStatusEnum.FROZEN.getCode().equals(user.getAccountStatus())) {
            throw new BusinessException("账号已被冻结，请联系客服");
        }
        if (AccountStatusEnum.CANCELLED.getCode().equals(user.getAccountStatus())) {
            throw new BusinessException("账号已注销");
        }
    }

    /** 登录前必须勾选协议。 */
    private void requireProtocolAgreement(Boolean agreeProtocol) {
        if (!Boolean.TRUE.equals(agreeProtocol)) {
            throw new BusinessException("AUTH_PROTOCOL_REQUIRED: 请先勾选协议");
        }
    }

    /** 组装移动端登录响应。 */
    private WechatLoginVO buildLoginVO(AppUser user, boolean isNew) {
        WechatLoginVO vo = new WechatLoginVO();
        vo.setToken(generateToken(user));
        vo.setUserId(user.getId());
        vo.setOpenid(user.getOpenid());
        vo.setPhone(user.getPhone());
        vo.setMaskedPhone(maskPhone(user.getPhone()));
        vo.setNickname(user.getNickname());
        vo.setAvatar(auditContentService.ownerAvatar(user.getId()));
        vo.setIsNewUser(isNew);
        boolean completed = user.getFirstLoginCompleted() != null && user.getFirstLoginCompleted() == 1;
        vo.setFirstLoginCompleted(completed);
        Integer nextStep = user.getFirstLoginNextStep() != null
                ? fieldConfigResolver.nextVisibleStep(user.getFirstLoginNextStep())
                : fieldConfigResolver.nextVisibleStep(1);
        vo.setNextStep(completed ? null : nextStep);
        vo.setAccessStatus(accessEvaluator.evaluate(user));
        return vo;
    }

    /** 生成小程序 token 并写入 Redis。 */
    private String generateToken(AppUser user) {
        String token = UUID.randomUUID().toString().replace("-", "");
        UserContext context = new UserContext();
        context.setId(user.getId());
        context.setNickname(user.getNickname());
        context.setRoles(Collections.emptyList());
        context.setPermissions(Collections.emptyList());
        try {
            String json = objectMapper.writeValueAsString(context);
            redisTemplate.opsForValue().set(AuthConstant.MINIAPP_TOKEN_PREFIX + token, json, Duration.ofDays(7));
        } catch (Exception e) {
            throw new BusinessException("登录状态创建失败");
        }
        return token;
    }

    private String normalizeLoginCode(WechatLoginReq req) {
        if (StrUtil.isNotBlank(req.getLoginCode())) {
            return req.getLoginCode();
        }
        throw new BusinessException("微信登录code不能为空");
    }

    private String normalizePhone(WechatMiniappClient.PhoneInfo phoneInfo) {
        if (phoneInfo == null || StrUtil.isBlank(phoneInfo.phoneNumber())) {
            throw new BusinessException("微信手机号授权失败，请重试");
        }
        return phoneInfo.phoneNumber().trim();
    }

    private String hashPhone(String phone) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(phone.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new BusinessException("手机号安全摘要生成失败");
        }
    }

    private String maskPhone(String phone) {
        if (phone == null || phone.length() < 7) {
            return phone;
        }
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }

    /** 读取短信验证码安全策略；配置缺失或异常时使用产品默认值。 */
    private SmsRules loadSmsRules() {
        SmsRules defaults = new SmsRules(60, 5, 10);
        AppConfig config = appConfigDao.selectByKey(SMS_RULES_KEY);
        if (config == null || StrUtil.isBlank(config.getConfigValue())) {
            return defaults;
        }
        try {
            JsonNode root = objectMapper.readTree(config.getConfigValue());
            JsonNode rows = root.isArray() ? root : root.get("rows");
            if (rows == null || !rows.isArray()) {
                return defaults;
            }
            int countdown = defaults.sendCountdownSeconds();
            int validMinutes = defaults.validMinutes();
            int dailyLimit = defaults.dailySendLimit();
            for (JsonNode row : rows) {
                String key = row.path("key").asText();
                String value = row.path("value").asText();
                if ("sendCountdownSeconds".equals(key)) {
                    countdown = parsePositiveInt(value, countdown);
                } else if ("validMinutes".equals(key)) {
                    validMinutes = parsePositiveInt(value, validMinutes);
                } else if ("dailySendLimit".equals(key)) {
                    dailyLimit = parsePositiveInt(value, dailyLimit);
                }
            }
            return new SmsRules(countdown, validMinutes, dailyLimit);
        } catch (Exception ex) {
            log.warn("parse sms rules config failed, configKey={}", SMS_RULES_KEY, ex);
            return defaults;
        }
    }

    private int parsePositiveInt(String value, int defaultValue) {
        int parsed = parseInt(value, defaultValue);
        return parsed > 0 ? parsed : defaultValue;
    }

    private int parseInt(String value, int defaultValue) {
        String normalized = normalizeRedisScalar(value);
        if (StrUtil.isBlank(normalized)) {
            return defaultValue;
        }
        try {
            return Integer.parseInt(normalized);
        } catch (NumberFormatException ex) {
            return defaultValue;
        }
    }

    /** 兼容 StringRedisTemplate 使用 JSON 序列化时产生的带引号标量值。 */
    private String normalizeRedisScalar(String value) {
        if (StrUtil.isBlank(value)) {
            return value;
        }
        String trimmed = value.trim();
        try {
            JsonNode node = objectMapper.readTree(trimmed);
            if (node != null && node.isTextual()) {
                return node.textValue();
            }
        } catch (Exception ignored) {
            // 非 JSON 标量按原值兼容处理。
        }
        return trimmed;
    }

    private String dailyKey(String phone) {
        return SMS_DAILY_PREFIX + LocalDate.now() + ":" + phone;
    }

    private Duration secondsUntilTomorrow() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime tomorrow = now.toLocalDate().plusDays(1).atStartOfDay();
        return Duration.between(now, tomorrow);
    }

    @Override
    @Transactional
    public WechatUsageVO resolveWechatUsage(WechatUsageReq req) {
        WechatMiniappClient.SessionInfo session = wechatMiniappClient.code2Session(req.getLoginCode());
        if (session == null || StrUtil.isBlank(session.openid())) {
            throw new BusinessException("微信身份识别失败，请重试");
        }
        AppUser existing = findWechatUser(session.openid(), session.unionid());
        WechatUsageVO result = new WechatUsageVO();
        result.setUsedBefore(existing != null);
        if (existing == null) {
            LoginTarget created = createNewUser(
                    session.openid(), RegisterSourceEnum.WECHAT.getCode(), null, session.unionid(), List.of());
            result.setProvisionalLogin(buildLoginVO(created.user(), true));
        }
        return result;
    }

    /** 登录过程中的用户、认证记录和是否新用户。 */
    private record LoginTarget(AppUser user, boolean isNew) {
    }

    /** 短信验证码频控配置。 */
    private record SmsRules(int sendCountdownSeconds, int validMinutes, int dailySendLimit) {
    }
}
