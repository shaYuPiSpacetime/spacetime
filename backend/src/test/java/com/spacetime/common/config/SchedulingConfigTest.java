package com.spacetime.common.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.scheduling.annotation.ScheduledAnnotationBeanPostProcessor;

import static org.assertj.core.api.Assertions.assertThat;

class SchedulingConfigTest {
    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withUserConfiguration(SchedulingConfig.class);

    @Test
    void productionKeepsSchedulingEnabledByDefault() {
        runner.run(context -> assertThat(context)
                .hasSingleBean(ScheduledAnnotationBeanPostProcessor.class));
    }

    @Test
    void testEnvironmentDoesNotRegisterScheduledTaskProcessor() {
        runner.withPropertyValues("spacetime.scheduling.enabled=false")
                .run(context -> assertThat(context)
                        .doesNotHaveBean(ScheduledAnnotationBeanPostProcessor.class));
    }
}
