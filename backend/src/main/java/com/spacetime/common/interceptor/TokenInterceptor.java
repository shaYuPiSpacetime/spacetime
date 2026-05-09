package com.spacetime.common.interceptor;

import cn.hutool.core.util.StrUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.constant.AuthConstant;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.nio.charset.StandardCharsets;

/**
 * 登录拦截器
 * 从请求头获取 token，从 Redis 查询用户上下文并写入 ThreadLocal
 * 根据 URI 前缀自动区分 admin 和 miniapp 两种 token
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TokenInterceptor implements HandlerInterceptor {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // 1. 获取请求头中的 token
        String token = request.getHeader(AuthConstant.TOKEN_HEADER);
        if (StrUtil.isBlank(token)) {
            response.setStatus(401);
            response.setContentType("application/json;charset=UTF-8");
            response.getOutputStream().write("{\"code\":401,\"msg\":\"未登录\"}".getBytes(StandardCharsets.UTF_8));
            return false;
        }
        // 2. 根据 URI 前缀选择 Redis key 前缀
        String prefix = request.getRequestURI().startsWith("/admin/")
                ? AuthConstant.ADMIN_TOKEN_PREFIX
                : AuthConstant.MINIAPP_TOKEN_PREFIX;
        // 3. 从 Redis 读取用户上下文 JSON
        String json = redisTemplate.opsForValue().get(prefix + token);
        if (json == null) {
            response.setStatus(401);
            response.setContentType("application/json;charset=UTF-8");
            response.getOutputStream().write("{\"code\":401,\"msg\":\"登录已过期\"}".getBytes(StandardCharsets.UTF_8));
            return false;
        }
        // 4. 反序列化并写入 ThreadLocal
        UserContext context = objectMapper.readValue(json, UserContext.class);
        UserContextHolder.set(context);
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        // 请求结束后清除 ThreadLocal，防止内存泄漏
        UserContextHolder.clear();
    }
}
