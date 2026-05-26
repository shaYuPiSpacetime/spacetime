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

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(tokenInterceptor)
                .addPathPatterns("/admin/**", "/miniapp/**")
                .excludePathPatterns(
                        "/admin/login",
                        "/miniapp/login/**",
                        "/miniapp/promotion/invite/rules",
                        "/miniapp/promotion/invite/share-log",
                        "/miniapp/promotion/invite/agent-source"
                );

        registry.addInterceptor(permissionInterceptor)
                .addPathPatterns("/admin/**")
                .excludePathPatterns("/admin/login", "/admin/logout", "/admin/routers");
    }
}
