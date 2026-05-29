package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * VIP 权益保存请求
 */
@Data
public class VipBenefitSaveReq {
    /** 权益编码 */
    @NotBlank(message = "权益编码不能为空")
    private String benefitCode;
    /** 权益名称 */
    @NotBlank(message = "权益名称不能为空")
    private String benefitName;
    /** 权益类型 */
    @NotBlank(message = "权益类型不能为空")
    private String benefitType;
    /** 权益描述 */
    private String benefitDesc;
    /** 展示排序 */
    private Integer displayOrder;
    /** 状态 */
    private String status;
}
