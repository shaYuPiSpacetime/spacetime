package com.spacetime.common.database;

import com.spacetime.common.mapper.AppUserMapper;
import org.apache.ibatis.annotations.Select;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.time.LocalDateTime;
import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;

class AccountStatusMessageReconcileMapperContractTest {

    @Test
    void shouldSelectRestrictedUsersMissingStableAccountMessageEvent() throws Exception {
        Method method = AppUserMapper.class.getMethod(
                "selectRestrictedWithoutMessage", LocalDateTime.class, int.class);
        String sql = String.join(" ", method.getAnnotation(Select.class).value());

        assertThat(sql)
                .contains("account_status IN ('FROZEN','CANCELLING','CANCELLED')")
                .contains("app_message_event_inbox")
                .contains("account-status:")
                .contains("i.id IS NULL")
                .contains("LIMIT #{limit}");
        assertThat(Arrays.stream(method.getParameterAnnotations())
                .flatMap(Arrays::stream)
                .map(Object::toString))
                .anyMatch(value -> value.contains("updatedAfter"));
    }
}
