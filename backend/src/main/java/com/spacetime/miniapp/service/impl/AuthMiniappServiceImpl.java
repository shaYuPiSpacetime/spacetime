package com.spacetime.miniapp.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.constant.AuthConstant;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserVerificationDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserVerification;
import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.common.enums.RegisterSourceEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.miniapp.dto.request.WechatLoginReq;
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
import java.util.UUID;

/**
 * 小程序微信授权登录服务实现
 * 首版使用 mock code2Session，后续接入微信真实接口
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthMiniappServiceImpl implements AuthMiniappService {

    private final AppUserDao appUserDao;
    private final AppUserVerificationDao verificationDao;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    /**
     * 微信 code 授权登录
     * 流程：1. mock code2Session → 2. 查用户 → 3a. 新用户自动注册 / 3b. 老用户校验账号状态 → 4. 生成 token
     * @param req 微信登录 code
     * @return token + userId + 是否已完成首登资料
     */
    @Override
    @Transactional
    public WechatLoginVO wechatLogin(WechatLoginReq req) {
        // 1. 调用微信 code2Session（首版 mock）
        String openId = mockCode2Session(req.getCode());
        if (openId == null) {
            throw new BusinessException("微信登录失败，请重试");
        }
        // 2. 根据 openId 查找用户
        AppUser user = appUserDao.selectOne(
                new LambdaQueryWrapper<AppUser>().eq(AppUser::getOpenid, openId));
        boolean isNew = user == null;
        if (isNew) {
            // 3a. 新用户自动注册
            user = createNewUser(openId);
        } else {
            // 3b. 老用户检查账号状态
            if (AccountStatusEnum.FROZEN.getCode().equals(user.getAccountStatus())) {
                throw new BusinessException("账号已被冻结，请联系客服");
            }
            if (AccountStatusEnum.CANCELLED.getCode().equals(user.getAccountStatus())) {
                throw new BusinessException("账号已注销");
            }
            user.setLastLoginTime(LocalDateTime.now());
            appUserDao.updateById(user);
        }
        // 4. 生成 token 写入 Redis
        String token = generateToken(user);
        // 5. 构造返回值
        WechatLoginVO vo = new WechatLoginVO();
        vo.setToken(token);
        vo.setUserId(user.getId());
        vo.setFirstLoginCompleted(user.getFirstLoginCompleted() != null && user.getFirstLoginCompleted() == 1);
        return vo;
    }

    /** 创建新用户并同步创建认证记录 */
    private AppUser createNewUser(String openId) {
        AppUser user = new AppUser();
        user.setOpenid(openId);
        user.setRegisterSource(RegisterSourceEnum.WECHAT.getCode());
        user.setRegisterTime(LocalDateTime.now());
        user.setLastLoginTime(LocalDateTime.now());
        user.setAccountStatus(AccountStatusEnum.NORMAL.getCode());
        user.setFirstLoginCompleted(0);
        user.setProfileScore(0);
        appUserDao.insert(user);
        // 同步创建认证记录
        AppUserVerification verification = new AppUserVerification();
        verification.setUserId(user.getId());
        verification.setVerifyLevel(0);
        verificationDao.insert(verification);
        return user;
    }

    /** 生成 UUID token 并存入 Redis，有效期7天 */
    private String generateToken(AppUser user) {
        String token = UUID.randomUUID().toString().replace("-", "");
        UserContext context = new UserContext();
        context.setId(user.getId());
        context.setNickname(user.getNickname());
        context.setRoles(Collections.emptyList());
        context.setPermissions(Collections.emptyList());
        try {
            String json = objectMapper.writeValueAsString(context);
            redisTemplate.opsForValue().set(
                    AuthConstant.MINIAPP_TOKEN_PREFIX + token,
                    json,
                    Duration.ofDays(7));
        } catch (Exception e) {
            throw new BusinessException("登录状态创建失败");
        }
        return token;
    }

    /** Mock 微信 code2Session，后续替换为真实微信 API 调用 */
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
        // 通用 fallback: 给任意 code 返回一个基于 hash 的 openId 用于调试
        return "wx_" + code.hashCode();
    }
}
