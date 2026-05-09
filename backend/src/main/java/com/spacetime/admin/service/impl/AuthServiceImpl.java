package com.spacetime.admin.service.impl;

import cn.hutool.core.util.IdUtil;
import cn.hutool.crypto.digest.BCrypt;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.admin.dto.request.LoginReq;
import com.spacetime.admin.dto.response.LoginVO;
import com.spacetime.admin.service.AuthService;
import com.spacetime.common.constant.AuthConstant;
import com.spacetime.common.dao.UserDao;
import com.spacetime.common.entity.SysUser;
import com.spacetime.common.enums.ResultCodeEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.interceptor.UserContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

/**
 * 认证服务实现
 * 使用 BCrypt 校验密码，登录后将 UserContext 存 Redis
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserDao userDao;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    @Override
    public LoginVO login(LoginReq req) {
        // 1. 按用户名查询用户
        SysUser user = userDao.selectByUsername(req.getUsername());
        if (user == null) {
            log.warn("login failed: user not found, username={}", req.getUsername());
            throw new BusinessException(ResultCodeEnum.BUSINESS_ERROR.getCode(), "用户名或密码错误");
        }
        // 2. BCrypt 校验密码
        if (!BCrypt.checkpw(req.getPassword(), user.getPassword())) {
            log.warn("login failed: wrong password, username={}", req.getUsername());
            throw new BusinessException(ResultCodeEnum.BUSINESS_ERROR.getCode(), "用户名或密码错误");
        }
        // 3. 检查账号状态
        if ("DISABLED".equals(user.getStatus())) {
            throw new BusinessException(ResultCodeEnum.BUSINESS_ERROR.getCode(), "账号已禁用");
        }
        // 4. 生成 token 并构造 UserContext 存入 Redis
        String token = IdUtil.simpleUUID();
        UserContext context = new UserContext(user.getId(), user.getNickname(), null);
        String json;
        try {
            json = objectMapper.writeValueAsString(context);
        } catch (Exception e) {
            log.error("serialize UserContext failed, userId={}", user.getId(), e);
            throw new BusinessException(ResultCodeEnum.SYSTEM_ERROR);
        }
        redisTemplate.opsForValue().set(AuthConstant.ADMIN_TOKEN_PREFIX + token,
                json, 7, TimeUnit.DAYS);
        log.info("login success: userId={}, nickname={}", user.getId(), user.getNickname());
        // 5. 组装返回
        LoginVO vo = new LoginVO();
        vo.setToken(token);
        vo.setNickname(user.getNickname());
        return vo;
    }

    @Override
    public void logout(String token) {
        if (token != null && !token.isEmpty()) {
            redisTemplate.delete(AuthConstant.ADMIN_TOKEN_PREFIX + token);
            log.info("logout success: token deleted");
        }
    }
}
