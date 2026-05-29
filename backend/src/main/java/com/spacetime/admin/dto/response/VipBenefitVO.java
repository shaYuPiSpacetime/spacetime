package com.spacetime.admin.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * VIP 权益响应
 */
@Data
public class VipBenefitVO {
    private Long id;
    private String benefitCode;
    private String benefitName;
    private String benefitType;
    private String benefitDesc;
    private Integer displayOrder;
    private String status;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
