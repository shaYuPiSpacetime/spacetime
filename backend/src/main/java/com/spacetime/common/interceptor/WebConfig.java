package com.spacetime.common.interceptor;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web MVC 配置
 * 注册 TokenInterceptor 和 PermissionInterceptor
 * TokenInterceptor 拦截 /admin/** 和 /miniapp/**（放行登录、移动端公开配置等接口）
 * PermissionInterceptor 在 TokenInterceptor 之后运行，校验 @RequirePermission 注解
 */
@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

    private final TokenInterceptor tokenInterceptor;
    private final PermissionInterceptor permissionInterceptor;

    /**
     * 允许管理后台、本地联调和微信开发者工具访问 API。
     */
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOriginPatterns(
                        "https://admin.shikongxiehou.com",
                        "http://localhost:*",
                        "http://127.0.0.1:*",
                        "https://servicewechat.com",
                        "https://*.servicewechat.com"
                )
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .exposedHeaders("Authorization")
                .allowCredentials(true)
                .maxAge(3600);
    }

    /**
     * 注册拦截器链
     * TokenInterceptor → PermissionInterceptor（admin 权限校验）
     */
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // 1. 登录拦截器：拦截 admin 和 miniapp 受保护接口，放行登录和公开配置
        registry.addInterceptor(tokenInterceptor)
                .addPathPatterns("/admin/**", "/miniapp/**")
                .excludePathPatterns(
                        "/admin/login",
                        "/miniapp/auth/**",
                        "/miniapp/config/**",
                        "/miniapp/dict/**",
                        "/miniapp/login/**",
                        "/miniapp/promotion/source-traces",
                        "/miniapp/app/h5-content/**",
                        "/miniapp/content/**",
                        "/miniapp/content-security/wechat/callback",
                        "/miniapp/mobile-config/**",
                        "/miniapp/payment/wechat/notify",
                        "/miniapp/search/hot-words",
                        "/miniapp/search/config"
                );

        // 2. 权限拦截器：仅拦截 admin 接口，放行登录/退出/路由
        registry.addInterceptor(permissionInterceptor)
                .addPathPatterns("/admin/**")
                .excludePathPatterns("/admin/login", "/admin/logout", "/admin/routers");
    }
}
