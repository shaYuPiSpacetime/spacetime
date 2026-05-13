package com.spacetime.admin.service.impl;

import cn.hutool.core.util.IdUtil;
import cn.hutool.crypto.digest.BCrypt;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.admin.dto.request.LoginReq;
import com.spacetime.admin.dto.response.LoginVO;
import com.spacetime.admin.service.AuthService;
import com.spacetime.common.constant.AuthConstant;
import com.spacetime.common.dao.MenuDao;
import com.spacetime.common.dao.UserDao;
import com.spacetime.common.entity.SysUser;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.enums.ResultCodeEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.interceptor.UserContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserDao userDao;
    private final MenuDao menuDao;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    @Override
    public LoginVO login(LoginReq req) {
        SysUser user = userDao.selectByUsernameOrPhone(req.getAccount());
        if (user == null) {
            log.warn("login failed: user not found, account={}", req.getAccount());
            throw new BusinessException(ResultCodeEnum.BUSINESS_ERROR.getCode(), "用户名或密码错误");
        }
        if (!BCrypt.checkpw(req.getPassword(), user.getPassword())) {
            log.warn("login failed: wrong password, account={}", req.getAccount());
            throw new BusinessException(ResultCodeEnum.BUSINESS_ERROR.getCode(), "用户名或密码错误");
        }
        if (CommonStatusEnum.DISABLED.getCode().equals(user.getStatus())) {
            throw new BusinessException(ResultCodeEnum.BUSINESS_ERROR.getCode(), "账号已禁用");
        }

        List<String> permissions = menuDao.selectPermsByUserId(user.getId());

        String token = IdUtil.simpleUUID();
        UserContext context = new UserContext(user.getId(), user.getNickname(), null, permissions);
        String json;
        try {
            json = objectMapper.writeValueAsString(context);
        } catch (Exception e) {
            log.error("serialize UserContext failed, userId={}", user.getId(), e);
            throw new BusinessException(ResultCodeEnum.SYSTEM_ERROR);
        }
        redisTemplate.opsForValue().set(AuthConstant.ADMIN_TOKEN_PREFIX + token,
                json, 7, TimeUnit.DAYS);

        user.setLastLoginTime(LocalDateTime.now());
        userDao.updateById(user);

        log.info("login success: userId={}, nickname={}, permissions={}",
                user.getId(), user.getNickname(), permissions);

        LoginVO vo = new LoginVO();
        vo.setToken(token);
        vo.setNickname(user.getNickname());
        vo.setAvatar(user.getAvatar());
        vo.setPermissions(permissions);
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
