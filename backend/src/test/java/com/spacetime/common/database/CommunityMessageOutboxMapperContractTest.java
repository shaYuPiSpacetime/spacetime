package com.spacetime.common.database;

import com.spacetime.common.mapper.CommunityEventOutboxMapper;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("社区消息 Outbox 原子消费 SQL")
class CommunityMessageOutboxMapperContractTest {

    @Test
    void shouldOnlyClaimSupportedMessageEventsAndRecoverStaleClaims() throws Exception {
        Method method = CommunityEventOutboxMapper.class.getMethod(
                "selectClaimable", LocalDateTime.class, LocalDateTime.class, int.class);
        String sql = String.join(" ", method.getAnnotation(Select.class).value());

        assertThat(sql)
                .contains("'report_result','moderation_result','community_interaction_summary'")
                .contains("'community_hot_topic','featured_content','community_activity','community_recall'")
                .contains("status='pending'")
                .contains("status='failed'")
                .contains("status='sending'")
                .contains("update_time<=#{staleBefore}")
                .contains("LIMIT #{limit}");
    }

    @Test
    void shouldUseCompareAndSetWhenClaimingAndCompleting() throws Exception {
        Method claim = CommunityEventOutboxMapper.class.getMethod(
                "claim", Long.class, LocalDateTime.class, LocalDateTime.class);
        Method sent = CommunityEventOutboxMapper.class.getMethod(
                "markSent", Long.class, LocalDateTime.class);
        Method failure = CommunityEventOutboxMapper.class.getMethod(
                "markFailure", Long.class, int.class, String.class,
                LocalDateTime.class, String.class, LocalDateTime.class);

        assertThat(String.join(" ", claim.getAnnotation(Update.class).value()))
                .contains("status='sending'")
                .contains("'report_result','moderation_result','community_interaction_summary'")
                .contains("'community_hot_topic','featured_content','community_activity','community_recall'");
        assertThat(String.join(" ", sent.getAnnotation(Update.class).value()))
                .contains("WHERE id=#{id} AND status='sending'");
        assertThat(String.join(" ", failure.getAnnotation(Update.class).value()))
                .contains("WHERE id=#{id} AND status='sending'");
    }
}
