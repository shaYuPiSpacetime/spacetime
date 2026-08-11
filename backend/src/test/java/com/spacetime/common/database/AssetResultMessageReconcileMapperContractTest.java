package com.spacetime.common.database;

import com.spacetime.common.mapper.AppMessageWhisperMapper;
import com.spacetime.common.mapper.TradeOrderMapper;
import org.apache.ibatis.annotations.Select;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class AssetResultMessageReconcileMapperContractTest {

    @Test
    void orderQueryShouldUseStatusSpecificStableEventKey() throws Exception {
        Method method = TradeOrderMapper.class.getMethod(
                "selectMessageNotifiableWithoutInbox", LocalDateTime.class, int.class);
        String sql = String.join(" ", method.getAnnotation(Select.class).value());
        assertThat(sql)
                .contains("order_status IN ('success','refunded')")
                .contains("app_message_event_inbox")
                .contains("order:")
                .contains("i.id IS NULL");
    }

    @Test
    void whisperQueryShouldOnlySelectCompletedCompensationsWithoutEvent() throws Exception {
        Method method = AppMessageWhisperMapper.class.getMethod(
                "selectRefundedWithoutMessage", LocalDateTime.class, int.class);
        String sql = String.join(" ", method.getAnnotation(Select.class).value());
        assertThat(sql)
                .contains("payment_status='refunded'")
                .contains("app_message_event_inbox")
                .contains("whisper:")
                .contains("i.id IS NULL");
    }
}
