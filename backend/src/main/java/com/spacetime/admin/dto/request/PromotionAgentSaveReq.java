package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 代理保存请求
 */
@Data
public class PromotionAgentSaveReq {
    /** 代理名称 */
    @NotBlank(message = "代理名称不能为空")
    private String agentName;
    /** 联系人 */
    private String contactName;
    /** 联系电话 */
    private String contactPhone;
    /** 学校 */
    private String school;
    /** 校区 */
    private String campus;
    /** 奖金规则组 */
    private String agentGroup;
    /** 状态 */
    private String status;
    /** 备注 */
    private String remark;
}
