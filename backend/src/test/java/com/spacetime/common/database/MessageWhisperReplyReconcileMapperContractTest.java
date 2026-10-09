package com.spacetime.common.database;

import com.spacetime.common.mapper.AppMessageWhisperMapper;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("悄悄话回复补偿SQL契约")
class MessageWhisperReplyReconcileMapperContractTest {

    @Test
    @DisplayName("完整TIM映射必须进入完成集且排除于释放集")
    void sentTimMappingMustWinOverDeadOutbox() throws Exception {
        Method finalizeQuery = AppMessageWhisperMapper.class.getMethod(
                "selectReplyReservationsReadyToFinalize", Long.class, int.class);
        Method releaseQuery = AppMessageWhisperMapper.class.getMethod(
                "selectReplyReservationsReadyToRelease", Long.class, int.class);
        Method releaseUpdate = AppMessageWhisperMapper.class.getMethod(
                "releaseFailedReplyReservation", Long.class, String.class,
                Long.class, java.time.LocalDateTime.class);

        String finalizeSql = String.join(" ",
                finalizeQuery.getAnnotation(Select.class).value());
        String releaseSql = String.join(" ",
                releaseQuery.getAnnotation(Select.class).value());
        String releaseUpdateSql = String.join(" ",
                releaseUpdate.getAnnotation(Update.class).value());

        assertThat(finalizeSql)
                .contains("m.send_status='sent'", "m.tim_message_id IS NOT NULL",
                        "m.tim_msg_key IS NOT NULL");
        assertThat(releaseSql)
                .contains("NOT (m.send_status='sent'", "m.tim_message_id IS NOT NULL",
                        "m.tim_msg_key IS NOT NULL");
        assertThat(releaseUpdateSql)
                .contains("INNER JOIN app_message_record", "o.status='dead'",
                        "NOT (m.send_status='sent'");
    }
}
