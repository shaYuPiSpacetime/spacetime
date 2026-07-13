package com.spacetime.miniapp.config;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.constant.AuthConstant;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.interceptor.UserContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.util.Collections;

/**
 * 本地开发固定登录会话。
 * 仅在 dev profile 启动时写入无过期时间的测试 token。
 */
@Slf4j
@Component
@Profile("dev")
public class DevFixedLoginInitializer implements ApplicationRunner {

    private final AppUserDao appUserDao;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final boolean enabled;
    private final String token;
    private final String phone;

    public DevFixedLoginInitializer(
            AppUserDao appUserDao,
            StringRedisTemplate redisTemplate,
            ObjectMapper objectMapper,
            @Value("${dev-fixed-login.enabled:false}") boolean enabled,
            @Value("${dev-fixed-login.token:}") String token,
            @Value("${dev-fixed-login.phone:}") String phone) {
        this.appUserDao = appUserDao;
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.enabled = enabled;
        this.token = token;
        this.phone = phone;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        if (!enabled) {
            return;
        }
        if (StrUtil.isBlank(token) || StrUtil.isBlank(phone)) {
            log.warn("dev 固定登录未配置 token 或手机号，跳过初始化");
            return;
        }

        AppUser user = appUserDao.selectOne(new LambdaQueryWrapper<AppUser>()
                .eq(AppUser::getPhone, phone)
                .last("LIMIT 1"));
        if (user == null) {
            log.warn("dev 固定登录用户不存在，手机号尾号={}", phone.length() >= 4
                    ? phone.substring(phone.length() - 4)
                    : "未知");
            return;
        }

        UserContext context = new UserContext(
                user.getId(),
                user.getNickname(),
                Collections.emptyList(),
                Collections.emptyList());
        redisTemplate.opsForValue().set(
                AuthConstant.MINIAPP_TOKEN_PREFIX + token,
                objectMapper.writeValueAsString(context));
        log.info("dev 固定登录已启用: userId={}, token 无过期时间", user.getId());
    }
}
