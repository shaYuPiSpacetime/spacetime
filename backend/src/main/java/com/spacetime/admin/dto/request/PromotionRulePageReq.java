package com.spacetime.admin.dto.request;

import com.spacetime.common.dto.PageReq;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 推广规则分页请求
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class PromotionRulePageReq extends PageReq {
    /** 规则类型 */
    private String ruleType;
    /** 事件类型 */
    private String eventType;
    /** 状态 */
    private String status;
}
