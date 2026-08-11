package com.spacetime.common.database;

import com.spacetime.common.mapper.AppMessageDeliveryOutboxMapper;
import org.apache.ibatis.annotations.Select;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class MessageTimMappingAuditMapperContractTest {

    @Test
    void shouldFindOnlyStaleLocalTimMappingInconsistencies() throws Exception {
        Method method = AppMessageDeliveryOutboxMapper.class.getMethod(
                "selectMappingInconsistencies", LocalDateTime.class, int.class);
        String sql = String.join(" ", method.getAnnotation(Select.class).value());

        assertThat(sql)
                .contains("app_message_record")
                .contains("o.status='sent'")
                .contains("o.status='dead'")
                .contains("r.tim_msg_key")
                .contains("o.provider_msg_key")
                .contains("o.update_time<=#{staleBefore}")
                .contains("LIMIT #{limit}");
    }
}
