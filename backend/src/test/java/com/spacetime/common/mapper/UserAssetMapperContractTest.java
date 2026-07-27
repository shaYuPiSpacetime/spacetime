package com.spacetime.common.mapper;

import org.apache.ibatis.annotations.Update;
import org.apache.ibatis.annotations.Select;
import org.junit.jupiter.api.Test;

import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;

/** 资产扣减 SQL 必须在数据库层阻止并发透支。 */
class UserAssetMapperContractTest {
    @Test
    void coinBalanceUpdateGuardsNegativeBalance() throws Exception {
        Update update = UserAssetMapper.class
                .getMethod("updateCoinBalance", Long.class, Integer.class)
                .getAnnotation(Update.class);
        String sql = String.join(" ", Arrays.asList(update.value())).toLowerCase();

        assertThat(sql).contains("coin_balance >= -#{delta}");
    }

    @Test
    void unlockConfirmationCanLockUserAssetBeforeCheckingAndCharging() throws Exception {
        Select select = UserAssetMapper.class
                .getMethod("selectByUserIdForUpdate", Long.class)
                .getAnnotation(Select.class);
        String sql = String.join(" ", Arrays.asList(select.value())).toLowerCase();

        assertThat(sql)
                .contains("where user_id = #{userid}")
                .contains("for update");
    }
}
