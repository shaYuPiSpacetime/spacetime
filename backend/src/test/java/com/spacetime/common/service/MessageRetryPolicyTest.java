package com.spacetime.common.service;

import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MessageRetryPolicyTest {

    @Test
    void shouldUseConfirmedSevenStageRetrySchedule() {
        assertThat(MessageRetryPolicy.nextDelay(1)).isEqualTo(Duration.ofMinutes(1));
        assertThat(MessageRetryPolicy.nextDelay(2)).isEqualTo(Duration.ofMinutes(5));
        assertThat(MessageRetryPolicy.nextDelay(3)).isEqualTo(Duration.ofMinutes(15));
        assertThat(MessageRetryPolicy.nextDelay(4)).isEqualTo(Duration.ofHours(1));
        assertThat(MessageRetryPolicy.nextDelay(5)).isEqualTo(Duration.ofHours(6));
        assertThat(MessageRetryPolicy.nextDelay(6)).isEqualTo(Duration.ofHours(12));
        assertThat(MessageRetryPolicy.nextDelay(7)).isEqualTo(Duration.ofHours(24));
        assertThat(MessageRetryPolicy.isDead(7)).isFalse();
        assertThat(MessageRetryPolicy.isDead(8)).isTrue();
    }

    @Test
    void shouldRejectDelayLookupAfterRetryBudgetIsExhausted() {
        assertThatThrownBy(() -> MessageRetryPolicy.nextDelay(8))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
