package com.spacetime.miniapp.service.impl;

import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.miniapp.dto.response.CoinBalanceVO;
import com.spacetime.miniapp.dto.response.MiniappAccountCancelCheckVO;
import com.spacetime.miniapp.dto.response.VipStatusVO;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * 注销风险的纯计算组件。所有面向用户的标题和说明由数据库配置传入。
 */
@Component
public class AccountCancellationRiskEvaluator {
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    public MiniappAccountCancelCheckVO evaluate(
            String accountStatus,
            boolean hasProcessingRefund,
            String manualBlockReason,
            VipStatusVO vip,
            CoinBalanceVO coin,
            int coolingDays,
            String description,
            List<String> reasons,
            Map<String, String> copy) {
        MiniappAccountCancelCheckVO result = new MiniappAccountCancelCheckVO();
        result.setCoolingDays(coolingDays);
        result.setDescription(description);
        result.setReasons(reasons != null ? reasons : List.of());
        result.setRecheckToken(UUID.randomUUID().toString().replace("-", ""));

        if (AccountStatusEnum.FROZEN.getCode().equals(accountStatus)
                || AccountStatusEnum.CANCELLED.getCode().equals(accountStatus)) {
            result.getHardBlocks().add(item(
                    "ACCOUNT_PENALTY",
                    requiredCopy(copy, "account_penalty.title"),
                    requiredCopy(copy, "account_penalty.description"),
                    "BLOCK"));
        }
        if (hasProcessingRefund) {
            result.getHardBlocks().add(item(
                    "REFUND_PROCESSING",
                    requiredCopy(copy, "refund_processing.title"),
                    requiredCopy(copy, "refund_processing.description"),
                    "BLOCK"));
        }
        if (StringUtils.hasText(manualBlockReason)) {
            result.getHardBlocks().add(item(
                    "MANUAL_BLOCK",
                    requiredCopy(copy, "manual_block.title"),
                    manualBlockReason,
                    "BLOCK"));
        }
        if (vip != null && "active".equalsIgnoreCase(vip.getVipStatus())) {
            String expireTime = vip.getVipExpireTime() != null
                    ? vip.getVipExpireTime().format(DATE_FMT)
                    : "";
            result.getRisks().add(item(
                    "VIP_ACTIVE",
                    requiredCopy(copy, "vip_active.title"),
                    requiredCopy(copy, "vip_active.description").replace("{expireTime}", expireTime),
                    "WARNING"));
        }
        int balance = coin != null && coin.getCoinBalance() != null ? coin.getCoinBalance() : 0;
        if (balance > 0) {
            result.getRisks().add(item(
                    "COIN_BALANCE",
                    requiredCopy(copy, "coin_balance.title"),
                    requiredCopy(copy, "coin_balance.description").replace("{balance}", String.valueOf(balance)),
                    "WARNING"));
        }
        result.setCanSubmit(result.getHardBlocks().isEmpty());
        return result;
    }

    private MiniappAccountCancelCheckVO.RiskItem item(
            String code, String title, String description, String severity) {
        MiniappAccountCancelCheckVO.RiskItem item = new MiniappAccountCancelCheckVO.RiskItem();
        item.setCode(code);
        item.setTitle(title);
        item.setDescription(description);
        item.setSeverity(severity);
        return item;
    }

    private String requiredCopy(Map<String, String> copy, String key) {
        String value = copy != null ? copy.get(key) : null;
        return Objects.requireNonNull(value, "缺少注销动态文案配置：" + key);
    }
}
