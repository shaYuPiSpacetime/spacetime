package com.spacetime.common.model.promotion;

import java.util.List;

/**
 * 注册推广事件必要上下文。
 */
public record PromotionRegisterPayload(List<String> traceNos) {
}
