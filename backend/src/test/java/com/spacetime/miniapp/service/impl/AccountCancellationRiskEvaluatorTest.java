package com.spacetime.miniapp.service.impl;

import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.miniapp.dto.response.CoinBalanceVO;
import com.spacetime.miniapp.dto.response.MiniappAccountCancelCheckVO;
import com.spacetime.miniapp.dto.response.VipStatusVO;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 账号注销风险计算契约测试。
 */
class AccountCancellationRiskEvaluatorTest {

    private final AccountCancellationRiskEvaluator evaluator = new AccountCancellationRiskEvaluator();

    @Test
    void frozenAccountAndProcessingRefundMustHardBlockCancellation() {
        MiniappAccountCancelCheckVO result = evaluator.evaluate(
                AccountStatusEnum.FROZEN.getCode(),
                true,
                null,
                new VipStatusVO(),
                coin(0),
                30,
                "注销说明",
                List.of("其他原因"),
                copy());

        assertThat(result.getCanSubmit()).isFalse();
        assertThat(result.getHardBlocks())
                .extracting(MiniappAccountCancelCheckVO.RiskItem::getCode)
                .containsExactly("ACCOUNT_PENALTY", "REFUND_PROCESSING");
        assertThat(result.getRisks()).isEmpty();
    }

    @Test
    void activeVipAndCoinBalanceAreConfirmableRisks() {
        VipStatusVO vip = new VipStatusVO();
        vip.setVipStatus("active");
        vip.setVipExpireTime(LocalDateTime.now().plusDays(20));

        MiniappAccountCancelCheckVO result = evaluator.evaluate(
                AccountStatusEnum.NORMAL.getCode(),
                false,
                null,
                vip,
                coin(88),
                30,
                "注销说明",
                List.of("暂时不需要使用"),
                copy());

        assertThat(result.getCanSubmit()).isTrue();
        assertThat(result.getHardBlocks()).isEmpty();
        assertThat(result.getRisks())
                .extracting(MiniappAccountCancelCheckVO.RiskItem::getCode)
                .containsExactly("VIP_ACTIVE", "COIN_BALANCE");
        assertThat(result.getCoolingDays()).isEqualTo(30);
        assertThat(result.getDescription()).isEqualTo("注销说明");
        assertThat(result.getReasons()).containsExactly("暂时不需要使用");
        assertThat(result.getRecheckToken()).isNotBlank();
    }

    @Test
    void manualRiskServiceFailureMustHardBlockInsteadOfSilentlyPassing() {
        MiniappAccountCancelCheckVO result = evaluator.evaluate(
                AccountStatusEnum.NORMAL.getCode(),
                false,
                "风险校验服务暂不可用，请稍后重试",
                new VipStatusVO(),
                coin(0),
                30,
                "注销说明",
                List.of(),
                copy());

        assertThat(result.getCanSubmit()).isFalse();
        assertThat(result.getHardBlocks())
                .extracting(MiniappAccountCancelCheckVO.RiskItem::getCode)
                .containsExactly("MANUAL_BLOCK");
    }

    private CoinBalanceVO coin(int balance) {
        CoinBalanceVO vo = new CoinBalanceVO();
        vo.setCoinBalance(balance);
        return vo;
    }

    private Map<String, String> copy() {
        return Map.ofEntries(
                Map.entry("account_penalty.title", "账号当前受限"),
                Map.entry("account_penalty.description", "账号存在未结束的处罚"),
                Map.entry("refund_processing.title", "存在处理中退款"),
                Map.entry("refund_processing.description", "请等待退款完成后重试"),
                Map.entry("manual_block.title", "暂时无法注销"),
                Map.entry("vip_active.title", "仍有会员权益"),
                Map.entry("vip_active.description", "会员有效期至 {expireTime}"),
                Map.entry("coin_balance.title", "仍有千寻币余额"),
                Map.entry("coin_balance.description", "当前余额 {balance}")
        );
    }
}
