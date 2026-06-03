package com.spacetime.miniapp.dto.response;

import lombok.Data;

/**
 * VIP 权益响应
 */
@Data
public class VipBenefitVO {
    /** 权益 ID */
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
}
