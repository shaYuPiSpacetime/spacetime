package com.spacetime.website.auth;

import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.nio.charset.StandardCharsets;
import java.util.List;

/** 官网独立会话；仅在同源请求中接受 HttpOnly Cookie。 */
@Component
@RequiredArgsConstructor
public class WebsiteSessionInterceptor implements HandlerInterceptor {
    public static final String COOKIE_NAME = "website_session";
    public static final String REDIS_PREFIX = "website:session:";
    private final StringRedisTemplate redis;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String path = request.getRequestURI();
        String method = request.getMethod();
        if ("POST".equals(method) && path.equals("/website/reports/public")) {
            return sameOrigin(request) || deny(response, 403, "来源校验失败");
        }
        if ("OPTIONS".equals(method) || path.startsWith("/website/auth/sms-code")
                || path.equals("/website/auth/login") || path.startsWith("/website/legal/")
                || ("GET".equals(method) && path.matches("/website/public-media/[0-9]+"))
                || ("GET".equals(method) && (path.equals("/website/activities")
                || path.matches("/website/activities/[0-9]+")))) return true;

        String token = null;
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if (COOKIE_NAME.equals(cookie.getName())) token = cookie.getValue();
            }
        }
        if (token == null || !token.matches("[a-f0-9]{32}")) return deny(response, 401, "请先登录");
        String value = redis.opsForValue().get(REDIS_PREFIX + token);
        if (value == null || !value.matches("[0-9]+\\|[a-f0-9]{32}")) return deny(response, 401, "登录已过期");
        String[] parts = value.split("\\|", 2);
        if (!"GET".equals(method) && !"HEAD".equals(method)) {
            if (!sameOrigin(request)) {
                return deny(response, 403, "来源校验失败");
            }
            if (!parts[1].equals(request.getHeader("X-CSRF-Token"))) return deny(response, 403, "请求校验失败");
        }
        request.setAttribute("websiteToken", token);
        request.setAttribute("websiteCsrf", parts[1]);
        UserContextHolder.set(new UserContext(Long.valueOf(parts[0]), "网站用户", List.of("website_user"), List.of()));
        return true;
    }

    private boolean sameOrigin(HttpServletRequest request) {
        String origin = request.getHeader("Origin");
        return origin == null || origin.equals("https://" + request.getServerName())
                || origin.equals("http://" + request.getServerName() + ":" + request.getServerPort());
    }

    private boolean deny(HttpServletResponse response, int status, String message) throws Exception {
        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");
        response.getOutputStream().write(("{\"code\":" + status + ",\"msg\":\"" + message + "\"}").getBytes(StandardCharsets.UTF_8));
        return false;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        UserContextHolder.clear();
    }
}
