package com.spacetime.common.interceptor;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web MVC 配置
 * 注册 TokenInterceptor 和 PermissionInterceptor
 * TokenInterceptor 拦截 /admin/** 和 /miniapp/**（放行登录接口）
 * PermissionInterceptor 在 TokenInterceptor 之后运行，校验 @RequirePermission 注解
 */
@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

    private final TokenInterceptor tokenInterceptor;
    private final PermissionInterceptor permissionInterceptor;

    /**
     * 注册拦截器链
     * TokenInterceptor → PermissionInterceptor（admin 权限校验）
     */
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // 1. 登录拦截器：拦截 admin 和 miniapp 所有接口
        registry.addInterceptor(tokenInterceptor)
                .addPathPatterns("/admin/**", "/miniapp/**")
                .excludePathPatterns(
                        "/admin/login",
                        "/miniapp/auth/**",
                        "/miniapp/login/**",
                        "/miniapp/promotion/invite/rules",
                        "/miniapp/promotion/invite/share-log",
                        "/miniapp/promotion/invite/qr-source",
                        "/miniapp/content/**",
                        "/miniapp/mobile-config/**",
                        "/miniapp/search/hot-words",
                        "/miniapp/search/config"
                );

        // 2. 权限拦截器：仅拦截 admin 接口，放行登录/退出/路由
        registry.addInterceptor(permissionInterceptor)
                .addPathPatterns("/admin/**")
                .excludePathPatterns("/admin/login", "/admin/logout", "/admin/routers");
    }
}
