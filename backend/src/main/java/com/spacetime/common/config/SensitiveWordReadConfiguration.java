package com.spacetime.common.config;

import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.context.annotation.*;

/** 仅注册 holder，不注册额外主库基础设施类型的 bean。 */
@Configuration(proxyBeanMethods=false)
public class SensitiveWordReadConfiguration {
    /** 从已有主库配置初始化有界读取资源。 */
    @Bean(destroyMethod="close")
    public SensitiveWordReadResources sensitiveWordReadResources(DataSourceProperties properties){
        return new SensitiveWordReadResources(properties.determineUrl(),properties.determineUsername(),
                properties.determinePassword(),properties.determineDriverClassName());
    }
}
