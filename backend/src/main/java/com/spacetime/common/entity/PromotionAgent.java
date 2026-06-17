package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 校园代理表
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("promotion_agent")
public class PromotionAgent extends BaseEntity {
    /** 代理展示编号 */
    private String agentNo;
    /** 代理名称 */
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
    /** 奖金规则组（正式版字段） */
    private String bonusRuleGroup;
    /** 状态 */
    private String status;
    /** 备注 */
    private String remark;
}
