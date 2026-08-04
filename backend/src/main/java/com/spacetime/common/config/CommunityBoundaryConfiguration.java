package com.spacetime.common.config;

import com.spacetime.common.community.ChatReportContextResolver;
import com.spacetime.common.community.UnavailableChatReportContextResolver;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 社区域的外部边界默认实现。
 *
 * <p>PRD-03 尚未提供可信聊天上下文解析器时，注册失败关闭实现；后续消息域接入真实
 * {@link ChatReportContextResolver} Bean 后会自动替换，不会形成多个候选 Bean。</p>
 */
@Configuration
public class CommunityBoundaryConfiguration {

    @Bean
    @ConditionalOnMissingBean(ChatReportContextResolver.class)
    public ChatReportContextResolver unavailableChatReportContextResolver() {
        return new UnavailableChatReportContextResolver();
    }
}
