package com.spacetime.admin.dto.request;

import com.spacetime.common.dto.PageReq;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 代理分页请求
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class PromotionAgentPageReq extends PageReq {
    /** 关键词 */
    private String keyword;
    /** 代理编号 */
    private String agentNo;
    /** 学校 */
    private String school;
    /** 状态 */
    private String status;
}
