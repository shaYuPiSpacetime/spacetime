package com.spacetime.miniapp.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.constant.AuthConstant;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserVerificationDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserVerification;
import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.common.enums.RegisterSourceEnum;
import com.spacetime.common.enums.VerificationStatusEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.miniapp.dto.request.PhoneLoginReq;
import com.spacetime.miniapp.dto.request.WechatLoginReq;
import com.spacetime.miniapp.dto.response.AccessStatusVO;
import com.spacetime.miniapp.dto.response.WechatLoginVO;
import com.spacetime.miniapp.service.AuthMiniappService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * 小程序登录服务实现。
 *
 * 微信登录和手机号登录共用同一响应结构，移动端可以统一处理首登续填、
 * 核心准入拦截和后续跳转。当前微信 code2Session 与短信验证码均为 mock，
 * 后续替换真实三方时只替换 Provider/校验逻辑，不改变接口契约。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthMiniappServiceImpl implements AuthMiniappService {

    /** 首版 mock 短信验证码，方便联调和自动化测试。 */
    private static final Set<String> MOCK_VALID_SMS_CODES = Set.of("000000", "123456");

    private final AppUserDao appUserDao;
    private final AppUserVerificationDao verificationDao;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    /** 微信授权登录。 */
    @Override
    @Transactional
    public WechatLoginVO wechatLogin(WechatLoginReq req) {
        requireProtocolAgreement(req.getAgreeProtocol());
        String openId = mockCode2Session(req.getCode());
        if (openId == null) {
            throw new BusinessException("微信登录失败，请重试");
        }
        LoginTarget target = loginByOpenId(openId, RegisterSourceEnum.WECHAT.getCode(), null);
        return buildLoginVO(target.user(), target.verification(), target.isNew());
    }

    /** 手机号验证码登录。 */
    @Override
    @Transactional
    public WechatLoginVO phoneLogin(PhoneLoginReq req) {
        requireProtocolAgreement(req.getAgreeProtocol());
        if (!MOCK_VALID_SMS_CODES.contains(req.getSmsCode())) {
            throw new BusinessException("AUTH_SMS_INVALID: 验证码错误或已过期");
        }
        String openId = "phone_" + req.getPhone();
        LoginTarget target = loginByOpenId(openId, RegisterSourceEnum.PHONE.getCode(), req.getPhone());
        return buildLoginVO(target.user(), target.verification(), target.isNew());
    }

    /**
     * 按 openId 登录或创建用户。
     *
     * 手机号登录复用 openId 字段保存 phone_手机号，避免在本期新增账号主表字段；
     * 真正手机号明文写入认证表 boundPhone，供实名前置校验和后台排查使用。
     */
    private LoginTarget loginByOpenId(String openId, String registerSource, String boundPhone) {
        AppUser user = appUserDao.selectOne(new LambdaQueryWrapper<AppUser>().eq(AppUser::getOpenid, openId));
        boolean isNew = user == null;
        AppUserVerification verification;
        if (isNew) {
            LoginTarget created = createNewUser(openId, registerSource, boundPhone);
            user = created.user();
            verification = created.verification();
        } else {
            checkAccountStatus(user);
            user.setLastLoginTime(LocalDateTime.now());
            appUserDao.updateById(user);
            verification = ensureVerification(user.getId(), boundPhone);
        }
        return new LoginTarget(user, verification, isNew);
    }

    /** 创建用户时同步初始化一条认证记录，避免后续资料/认证接口断链。 */
    private LoginTarget createNewUser(String openId, String registerSource, String boundPhone) {
        AppUser user = new AppUser();
        user.setOpenid(openId);
        user.setRegisterSource(registerSource);
        user.setRegisterTime(LocalDateTime.now());
        user.setLastLoginTime(LocalDateTime.now());
        user.setAccountStatus(AccountStatusEnum.NORMAL.getCode());
        user.setFirstLoginCompleted(0);
        user.setProfileScore(0);
        appUserDao.insert(user);

        AppUserVerification verification = new AppUserVerification();
        verification.setUserId(user.getId());
        verification.setBoundPhone(boundPhone);
        verification.setVerifyLevel(0);
        verificationDao.insert(verification);
        return new LoginTarget(user, verification, true);
    }

    /**
     * 兜底保证认证记录存在。
     *
     * 老数据可能缺少认证记录或手机号绑定信息，这里在登录入口补齐，避免移动端
     * 进入认证中心后因为缺少 app_user_verification 记录直接报错。
     */
    private AppUserVerification ensureVerification(Long userId, String boundPhone) {
        AppUserVerification verification = verificationDao.selectOne(
                new LambdaQueryWrapper<AppUserVerification>().eq(AppUserVerification::getUserId, userId));
        if (verification == null) {
            verification = new AppUserVerification();
            verification.setUserId(userId);
            verification.setBoundPhone(boundPhone);
            verification.setVerifyLevel(0);
            verificationDao.insert(verification);
            return verification;
        }
        if (StrUtil.isNotBlank(boundPhone) && StrUtil.isBlank(verification.getBoundPhone())) {
            verification.setBoundPhone(boundPhone);
            verificationDao.updateById(verification);
        }
        return verification;
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
    private WechatLoginVO buildLoginVO(AppUser user, AppUserVerification verification, boolean isNew) {
        WechatLoginVO vo = new WechatLoginVO();
        vo.setToken(generateToken(user));
        vo.setUserId(user.getId());
        vo.setIsNewUser(isNew);
        boolean completed = user.getFirstLoginCompleted() != null && user.getFirstLoginCompleted() == 1;
        vo.setFirstLoginCompleted(completed);
        vo.setNextStep(completed ? null : 1);
        vo.setAccessStatus(buildAccessStatus(user, verification));
        return vo;
    }

    /**
     * 登录态下的快速准入判断。
     *
     * 完整准入仍以 ProfileService/AccessDecisionService 为准；这里返回同口径字段，
     * 让移动端登录后即可决定进入首登、普通浏览或核心能力拦截页。
     */
    private AccessStatusVO buildAccessStatus(AppUser user, AppUserVerification verification) {
        AccessStatusVO vo = new AccessStatusVO();
        if (user.getFirstLoginCompleted() == null || user.getFirstLoginCompleted() != 1) {
            applyBlocked(vo, false, "请先完成资料初始化");
            return vo;
        }
        boolean tripleApproved = isApproved(verification == null ? null : verification.getRealNameStatus())
                && isApproved(verification == null ? null : verification.getAvatarVerifyStatus())
                && isApproved(verification == null ? null : verification.getEducationStatus());
        vo.setCanBrowseCards(true);
        vo.setCanCommunity(true);
        vo.setCanMatch(tripleApproved);
        vo.setCanMessage(tripleApproved);
        vo.setCanBeExposed(tripleApproved);
        vo.setCoreAccessStatus(tripleApproved ? "CORE_ALLOWED" : "NON_CORE_ONLY");
        vo.setBlockReason(tripleApproved ? null : "三重认证未全部通过");
        vo.setBlockReasons(tripleApproved ? List.of() : List.of(vo.getBlockReason()));
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
        vo.setBlockReason(reason);
        vo.setBlockReasons(List.of(reason));
    }

    private boolean isApproved(String status) {
        return VerificationStatusEnum.APPROVED.getCode().equals(status);
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

    /** mock 微信 code2Session，后续接真实微信接口时替换这里。 */
    private String mockCode2Session(String code) {
        if ("mock_new_user_code".equals(code)) {
            return "mock_openid_new_" + System.currentTimeMillis();
        }
        if ("mock_existing_user_code".equals(code)) {
            return "mock_openid_existing";
        }
        if ("mock_frozen_user_code".equals(code)) {
            return "mock_openid_frozen";
        }
        return "wx_" + code.hashCode();
    }

    /** 登录过程中的用户、认证记录和是否新用户。 */
    private record LoginTarget(AppUser user, AppUserVerification verification, boolean isNew) {
    }
}
