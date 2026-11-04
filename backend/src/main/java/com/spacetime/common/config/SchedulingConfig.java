package com.spacetime.common.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** 独立测试环境关闭自动任务，避免复制数据后重复处理订单、退款和消息。 */
@Configuration
@EnableScheduling
@ConditionalOnProperty(name = "spacetime.scheduling.enabled", havingValue = "true", matchIfMissing = true)
public class SchedulingConfig {
}
