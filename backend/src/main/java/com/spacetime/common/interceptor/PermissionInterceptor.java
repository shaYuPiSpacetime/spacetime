package com.spacetime.common.interceptor;

import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.dao.MenuDao;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * 权限拦截器，在 TokenInterceptor 之后执行
 * 读取 @RequirePermission 注解，校验当前用户是否拥有所需权限
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PermissionInterceptor implements HandlerInterceptor {

    private final MenuDao menuDao;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        if (!(handler instanceof HandlerMethod hm)) {
            return true;
        }
        RequirePermission annotation = hm.getMethodAnnotation(RequirePermission.class);
        if (annotation == null) {
            return true;
        }
        String requiredPerm = annotation.value();
        UserContext ctx = UserContextHolder.get();
        if (ctx == null) {
            response.setStatus(403);
            response.setContentType("application/json;charset=UTF-8");
            response.getOutputStream().write("{\"code\":403,\"msg\":\"无权限\"}".getBytes(StandardCharsets.UTF_8));
            return false;
        }
        List<String> currentPermissions = menuDao.selectPermsByUserId(ctx.getId());
        if (currentPermissions == null || !currentPermissions.contains(requiredPerm)) {
            log.warn("permission denied: userId={}, required={}, currentPermissions={}",
                    ctx.getId(), requiredPerm, currentPermissions);
            response.setStatus(403);
            response.setContentType("application/json;charset=UTF-8");
            response.getOutputStream().write("{\"code\":403,\"msg\":\"无权限\"}".getBytes(StandardCharsets.UTF_8));
            return false;
        }
        ctx.setPermissions(List.copyOf(currentPermissions));
        return true;
    }
}
