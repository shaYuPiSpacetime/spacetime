package com.spacetime.common.mapper;

import org.apache.ibatis.annotations.Update;
import org.apache.ibatis.annotations.Select;
import org.junit.jupiter.api.Test;

import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;

/** 资产扣减 SQL 必须在数据库层阻止并发透支。 */
class UserAssetMapperContractTest {
    @Test
    void assetInitializationUsesUniqueUserWithoutResettingExistingAssets() {
        org.apache.ibatis.session.Configuration configuration = new org.apache.ibatis.session.Configuration();
        configuration.addMapper(UserAssetMapper.class);
        org.apache.ibatis.mapping.BoundSql boundSql = configuration
                .getMappedStatement(UserAssetMapper.class.getName() + ".initializeIfAbsent")
                .getBoundSql(java.util.Map.of("userId", 201L));
        String sql = boundSql.getSql().toLowerCase();
        assertThat(sql).contains("insert into app_user_asset", "'inactive', 0, 0, 0", "on duplicate key update");
        // 冲突分支只保留用户键，不能覆盖余额、会员、充值或逻辑删除状态。
        assertThat(sql.substring(sql.indexOf("on duplicate key update")))
                .isEqualTo("on duplicate key update user_id = ?");
        assertThat(boundSql.getParameterMappings()).extracting("property").containsExactly("userId", "userId");
    }

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
