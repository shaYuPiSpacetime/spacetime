package com.spacetime.common.service;

import com.spacetime.common.entity.PromotionAgentSettlement;

import java.time.YearMonth;
import java.util.List;

/**
 * 校园推广员自然月结算服务。
 */
public interface PromotionSettlementDomainService {
    List<PromotionAgentSettlement> generate(YearMonth month);
    PromotionAgentSettlement confirm(String settlementNo, Long operatorId);
}
