package com.spacetime.common.dto;

import lombok.Data;

/**
 * 核心准入判定结果。
 */
@Data
public class AccessDecision {
    /** 核心准入状态：CORE_ALLOWED、CORE_BLOCKED、NON_CORE_ONLY。 */
    private String coreAccessStatus;
    /** 是否可浏览卡片。 */
    private Boolean canBrowseCards;
    /** 是否可发起匹配。 */
    private Boolean canMatch;
    /** 是否可被其他用户曝光。 */
    private Boolean canBeExposed;
    /** 阻断原因。 */
    private String blockReason;

    /** 完全或部分阻断。 */
    public static AccessDecision blocked(boolean canBrowseCards, String blockReason) {
        AccessDecision decision = new AccessDecision();
        decision.setCoreAccessStatus("CORE_BLOCKED");
        decision.setCanBrowseCards(canBrowseCards);
        decision.setCanMatch(false);
        decision.setCanBeExposed(false);
        decision.setBlockReason(blockReason);
        return decision;
    }

    /** 已完成首登但三重认证未齐，只开放非核心能力。 */
    public static AccessDecision nonCoreOnly(String blockReason) {
        AccessDecision decision = new AccessDecision();
        decision.setCoreAccessStatus("NON_CORE_ONLY");
        decision.setCanBrowseCards(true);
        decision.setCanMatch(false);
        decision.setCanBeExposed(false);
        decision.setBlockReason(blockReason);
        return decision;
    }

    /** 三重认证全部通过，开放核心能力。 */
    public static AccessDecision allowed() {
        AccessDecision decision = new AccessDecision();
        decision.setCoreAccessStatus("CORE_ALLOWED");
        decision.setCanBrowseCards(true);
        decision.setCanMatch(true);
        decision.setCanBeExposed(true);
        decision.setBlockReason(null);
        return decision;
    }
}
