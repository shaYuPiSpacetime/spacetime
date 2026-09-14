package com.spacetime.common.dao;

import com.spacetime.common.mapper.UserCoinLogMapper;
import org.apache.ibatis.annotations.Select;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** 千寻币退款的历史入账归因查询契约。 */
@DisplayName("千寻币购买流水归因")
class UserCoinLogPurchaseAttributionTest {

    @Test
    @DisplayName("只按原交易订单的充值流水读取实际入账数量")
    void shouldSelectExactRechargeLogByTradeOrder() throws Exception {
        Select select = UserCoinLogMapper.class
                .getMethod("selectPurchaseByOrderId", Long.class)
                .getAnnotation(Select.class);
        String sql = String.join(" ", select.value());

        assertThat(sql)
                .contains("ref_id=#{orderId}")
                .contains("ref_type='trade_order'")
                .contains("flow_type='recharge'")
                .contains("biz_scene='coin_recharge'")
                .contains("change_amount>0")
                .contains("deleted=0")
                .contains("ORDER BY id DESC LIMIT 1");
    }
}
