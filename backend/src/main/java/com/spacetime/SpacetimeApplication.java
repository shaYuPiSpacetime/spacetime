package com.spacetime;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Spacetime 平台启动类
 * MapperScan 扫描 common/mapper 包下所有 Mapper 接口
 */
@SpringBootApplication
@MapperScan("com.spacetime.common.mapper")
public class SpacetimeApplication {
    public static void main(String[] args) {
        SpringApplication.run(SpacetimeApplication.class, args);
    }
}
