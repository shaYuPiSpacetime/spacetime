package com.spacetime.admin.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * VIP 权益响应
 */
@Data
public class VipBenefitVO {
    /** 主键ID */
    private Long id;
    /** 权益编码 */
    private String benefitCode;
    /** 权益名称 */
    private String benefitName;
    /** 权益类型 */
    private String benefitType;
    /** 权益描述 */
    private String benefitDesc;
    /** 展示顺序 */
    private Integer displayOrder;
    /** 状态 @see CommonStatusEnum */
    private String status;
    /** 创建时间 */
    private LocalDateTime createTime;
    /** 更新时间 */
    private LocalDateTime updateTime;
}
