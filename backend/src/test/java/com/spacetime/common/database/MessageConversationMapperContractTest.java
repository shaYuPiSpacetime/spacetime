package com.spacetime.common.database;

import com.spacetime.common.mapper.AppMessageConversationMapper;
import org.apache.ibatis.annotations.Update;
import org.apache.ibatis.annotations.Select;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class MessageConversationMapperContractTest {

    @Test
    void callbackLookupMustBindMessageToLifecycleAtSendTime() throws Exception {
        Select select = AppMessageConversationMapper.class
                .getMethod("selectPairAtMessageTimeForUpdate", Long.class, Long.class,
                        java.time.LocalDateTime.class)
                .getAnnotation(Select.class);

        String sql = String.join(" ", select.value()).toLowerCase();
        assertThat(sql).contains("create_time<=#{messagetime}",
                "invalid_time is null or invalid_time>=#{messagetime}",
                "order by create_time desc,id desc", "for update");
    }

    @Test
    void touchMessageMustNotReviveTerminalConversationProjection() throws Exception {
        Update update = AppMessageConversationMapper.class
                .getMethod("touchMessage", Long.class, Long.class,
                        java.time.LocalDateTime.class, boolean.class)
                .getAnnotation(Update.class);

        String sql = String.join(" ", update.value()).toLowerCase();
        assertThat(sql).contains("status='active'", "active_marker=1", "deleted=0");
    }
}
