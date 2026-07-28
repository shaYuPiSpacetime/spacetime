package com.spacetime.admin.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * 推广规则发布请求。
 */
@Data
public class PromotionRulePublishReq {
    @NotBlank(message = "来源类型不能为空")
    private String sourceType;
    @NotBlank(message = "奖励模式不能为空")
    private String rewardMode;
    @NotNull(message = "期望版本不能为空")
    @PositiveOrZero(message = "期望版本不能为负数")
    private Integer expectedVersion;
    @Valid
    @NotNull(message = "奖励事件不能为空")
    @Size(min = 5, max = 5, message = "必须且只能配置五个基础奖励事件")
    private List<EventItem> events;
    @Valid
    @Size(max = 50, message = "阶梯档位不能超过50个")
    private List<TierItem> tiers;

    @Data
    public static class EventItem {
        @NotBlank(message = "事件类型不能为空")
        @Size(max = 50, message = "事件类型长度不能超过50个字符")
        private String eventType;
        @NotNull(message = "是否启用不能为空")
        private Boolean enabled;
        @NotNull(message = "奖励金额不能为空")
        @PositiveOrZero(message = "奖励金额不能为负数")
        private BigDecimal amount;
    }

    @Data
    public static class TierItem {
        @NotNull(message = "阶梯人数不能为空")
        @Positive(message = "阶梯人数必须大于0")
        private Integer threshold;
        @NotNull(message = "阶梯金额不能为空")
        @Positive(message = "阶梯金额必须大于0")
        private BigDecimal amount;
        @NotNull(message = "是否启用不能为空")
        private Boolean enabled;
    }
}
