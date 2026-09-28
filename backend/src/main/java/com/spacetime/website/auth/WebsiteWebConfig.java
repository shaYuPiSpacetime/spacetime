package com.spacetime.website.auth;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** 官网域名与小程序、管理端分别校验会话。 */
@Configuration
@RequiredArgsConstructor
public class WebsiteWebConfig implements WebMvcConfigurer {
    private final WebsiteSessionInterceptor interceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(interceptor).addPathPatterns("/website/**");
    }
}
