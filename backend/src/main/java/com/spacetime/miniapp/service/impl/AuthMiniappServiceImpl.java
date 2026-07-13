package com.spacetime.miniapp.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.constant.AuthConstant;
import com.spacetime.common.dao.AppConfigDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.entity.AppConfig;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.common.enums.RegisterSourceEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.provider.SmsCodeProvider;
import com.spacetime.common.service.AppUserAuditService;
import com.spacetime.common.service.AppUserAuditContentService;
import com.spacetime.miniapp.dto.request.PhoneLoginReq;
import com.spacetime.miniapp.dto.request.PhoneSmsCodeReq;
import com.spacetime.miniapp.dto.request.WechatLoginReq;
import com.spacetime.miniapp.dto.response.AccessStatusVO;
import com.spacetime.miniapp.dto.response.PhoneSmsCodeVO;
import com.spacetime.miniapp.dto.response.WechatLoginVO;
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
import java.util.List;
import java.util.UUID;

/**
 * 小程序登录服务实现。
 *
 * 微信登录和手机号登录共用同一响应结构，移动端可以统一处理首登续填、
 * 核心准入拦截和后续跳转。短信验证码走 Provider 抽象和 Redis 频控；
 * 当前默认 mock 通道，真实短信三方接入时替换 Provider 即可。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthMiniappServiceImpl implements AuthMiniappService {

    private static final String SMS_RULES_KEY = "prd01.security.sms.rules";
    private static final String SMS_CODE_PREFIX = "miniapp:auth:sms:code:";
    private static final String SMS_COOLDOWN_PREFIX = "miniapp:auth:sms:cooldown:";
    private static final String SMS_DAILY_PREFIX = "miniapp:auth:sms:daily:";

    private final AppUserDao appUserDao;
    private final AppUserAuditService auditService;
    private final AppUserAuditContentService auditContentService;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final WechatMiniappClient wechatMiniappClient;
    private final AppConfigDao appConfigDao;
    private final SmsCodeProvider smsCodeProvider;
    private final Prd01FieldConfigResolver fieldConfigResolver;

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
        LoginTarget target = loginByOpenId(session.openid(), RegisterSourceEnum.WECHAT.getCode(), phone, session.unionid());
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

        String code = smsCodeProvider.generateCode();
        try {
            smsCodeProvider.sendLoginCode(phone, code, rules.validMinutes());
        } catch (Exception ex) {
            log.warn("send sms code failed, phone={}, provider={}", phone, smsCodeProvider.providerCode(), ex);
            throw new BusinessException("AUTH_SMS_SEND_FAILED: 验证码发送失败，请稍后重试");
        }

        redisTemplate.opsForValue().set(SMS_CODE_PREFIX + phone, code, Duration.ofMinutes(rules.validMinutes()));
        redisTemplate.opsForValue().set(cooldownKey, "1", Duration.ofSeconds(rules.sendCountdownSeconds()));
        redisTemplate.opsForValue().set(dailyKey, String.valueOf(usedCount + 1), secondsUntilTomorrow());

        PhoneSmsCodeVO vo = new PhoneSmsCodeVO();
        vo.setCountdownSeconds(rules.sendCountdownSeconds());
        vo.setValidMinutes(rules.validMinutes());
        vo.setDailyLimit(rules.dailySendLimit());
        vo.setDailyRemaining(Math.max(0, rules.dailySendLimit() - usedCount - 1));
        vo.setProviderCode(smsCodeProvider.providerCode());
        return vo;
    }

    /** 手机号验证码登录。 */
    @Override
    @Transactional
    public WechatLoginVO phoneLogin(PhoneLoginReq req) {
        requireProtocolAgreement(req.getAgreeProtocol());
        String phone = req.getPhone().trim();
        String codeKey = SMS_CODE_PREFIX + phone;
        String cachedCode = redisTemplate.opsForValue().get(codeKey);
        if (StrUtil.isBlank(cachedCode) || !cachedCode.equals(req.getSmsCode().trim())) {
            throw new BusinessException("AUTH_SMS_INVALID: 验证码错误或已过期");
        }
        redisTemplate.delete(codeKey);
        String openId = "phone_" + phone;
        LoginTarget target = loginByOpenId(openId, RegisterSourceEnum.PHONE.getCode(), phone, null);
        return buildLoginVO(target.user(), target.isNew());
    }

    /**
     * 按 openId 登录或创建用户。
     *
     * 手机号登录复用 openId 字段保存 phone_手机号；本期不在登录时生成认证审核记录。
     */
    private LoginTarget loginByOpenId(String openId, String registerSource, String boundPhone, String unionid) {
        AppUser user = appUserDao.selectOne(new LambdaQueryWrapper<AppUser>().eq(AppUser::getOpenid, openId));
        boolean isNew = user == null;
        if (isNew) {
            LoginTarget created = createNewUser(openId, registerSource, boundPhone, unionid);
            user = created.user();
        } else {
            checkAccountStatus(user);
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

    /** 创建用户；认证记录按用户后续真实提交生成，不在登录时默认落库。 */
    private LoginTarget createNewUser(String openId, String registerSource, String boundPhone, String unionid) {
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
        user.setProfileScore(0);
        appUserDao.insert(user);
        return new LoginTarget(user, true);
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
        vo.setAccessStatus(buildAccessStatus(user));
        return vo;
    }

    /**
     * 登录态下的快速准入判断。
     *
     * 完整准入仍以 ProfileService 为准；这里返回同口径字段，
     * 让移动端登录后即可决定进入首登、普通浏览或核心能力拦截页。
     */
    private AccessStatusVO buildAccessStatus(AppUser user) {
        AccessStatusVO vo = new AccessStatusVO();
        if (user.getFirstLoginCompleted() == null || user.getFirstLoginCompleted() != 1) {
            applyBlocked(vo, false, "请先完成资料初始化");
            return vo;
        }
        boolean tripleApproved = auditService.certificationApprovedCount(user.getId()) == 3;
        vo.setCanBrowseCards(true);
        vo.setCanCommunity(true);
        vo.setCanMatch(tripleApproved);
        vo.setCanMessage(tripleApproved);
        vo.setCanBeExposed(tripleApproved);
        vo.setCoreAccessStatus(tripleApproved ? "CORE_ALLOWED" : "NON_CORE_ONLY");
        vo.setBlockReasons(tripleApproved ? List.of() : List.of("三重认证未全部通过"));
        return vo;
    }

    /** 设置完全阻断状态。 */
    private void applyBlocked(AccessStatusVO vo, boolean canBrowse, String reason) {
        vo.setCanBrowseCards(canBrowse);
        vo.setCanCommunity(canBrowse);
        vo.setCanMatch(false);
        vo.setCanMessage(false);
        vo.setCanBeExposed(false);
        vo.setCoreAccessStatus("CORE_BLOCKED");
        vo.setBlockReasons(List.of(reason));
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
        if (StrUtil.isBlank(value)) {
            return defaultValue;
        }
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException ex) {
            return defaultValue;
        }
    }

    private String dailyKey(String phone) {
        return SMS_DAILY_PREFIX + LocalDate.now() + ":" + phone;
    }

    private Duration secondsUntilTomorrow() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime tomorrow = now.toLocalDate().plusDays(1).atStartOfDay();
        return Duration.between(now, tomorrow);
    }

    /** 登录过程中的用户、认证记录和是否新用户。 */
    private record LoginTarget(AppUser user, boolean isNew) {
    }

    /** 短信验证码频控配置。 */
    private record SmsRules(int sendCountdownSeconds, int validMinutes, int dailySendLimit) {
    }
}
