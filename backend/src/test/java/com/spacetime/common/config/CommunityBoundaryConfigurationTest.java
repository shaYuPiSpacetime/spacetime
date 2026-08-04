package com.spacetime.common.config;

import com.spacetime.common.community.ChatReportContextResolver;
import com.spacetime.common.community.TrustedChatReportContext;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import static org.assertj.core.api.Assertions.assertThat;

class CommunityBoundaryConfigurationTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(CommunityBoundaryConfiguration.class);

    @Test
    void shouldRegisterFailClosedResolverWhenPrd03AdapterIsMissing() {
        contextRunner.run(context -> {
            assertThat(context).hasSingleBean(ChatReportContextResolver.class);
            assertThat(context.getBean(ChatReportContextResolver.class))
                    .hasSameClassAs(new com.spacetime.common.community.UnavailableChatReportContextResolver());
        });
    }

    @Test
    void shouldBackOffWhenPrd03ProvidesTrustedResolver() {
        new ApplicationContextRunner()
                .withUserConfiguration(Prd03ResolverConfiguration.class, CommunityBoundaryConfiguration.class)
                .run(context -> {
            assertThat(context).hasSingleBean(ChatReportContextResolver.class);
            assertThat(context.getBean(ChatReportContextResolver.class))
                    .isSameAs(context.getBean("prd03Resolver"));
        });
    }

    @Configuration
    static class Prd03ResolverConfiguration {
        @Bean
        ChatReportContextResolver prd03Resolver() {
            return (reporterId, lookup) -> new TrustedChatReportContext("message", 1L, "chat", "{}");
        }
    }
}
