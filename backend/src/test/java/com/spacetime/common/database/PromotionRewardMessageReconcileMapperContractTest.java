package com.spacetime.common.database;

import com.spacetime.common.mapper.PromotionRewardLogMapper;
import org.apache.ibatis.annotations.Select;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class PromotionRewardMessageReconcileMapperContractTest {

    @Test
    void shouldFindOnlyTerminalRewardsMissingTheirStableMessageEvent() throws Exception {
        Method method = PromotionRewardLogMapper.class.getMethod(
                "selectTerminalWithoutMessage", LocalDateTime.class, int.class);
        String sql = String.join(" ", method.getAnnotation(Select.class).value());

        assertThat(sql)
                .contains("r.status='success'")
                .contains("r.status='failed'")
                .contains("r.next_retry_time IS NULL")
                .contains("r.retry_count>=4")
                .contains("prd07:system_message_create:")
                .contains("i.id IS NULL")
                .contains("LIMIT #{limit}");
    }
}
