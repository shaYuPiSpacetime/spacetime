package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 推广规则保存请求
 */
@Data
public class PromotionRuleSaveReq {
    /** 规则名称 */
    @NotBlank(message = "规则名称不能为空")
    private String ruleName;
    /** 规则类型 */
    @NotBlank(message = "规则类型不能为空")
    private String ruleType;
    /** 奖励事件 */
    @NotBlank(message = "事件类型不能为空")
    private String eventType;
    /** 奖励金额 */
    private BigDecimal rewardAmount;
    /** 奖励单位 */
    private String rewardUnit;
    /** 单日上限 */
    private BigDecimal dailyLimit;
    /** 生效时间 */
    private LocalDateTime effectiveTime;
    /** 失效时间 */
    private LocalDateTime expireTime;
    /** 适用代理组 */
    private String agentGroup;
    /** 状态 */
    private String status;
    /** 备注 */
    private String remark;
}
