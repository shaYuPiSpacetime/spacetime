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
    /** 移动端图标 */
    private String mobileIcon;
    /** 权益数值 */
    private Integer benefitValue;
    /** 是否固定权益（0=否 1=是） */
    private Integer fixedFlag;
    /** 展示顺序 */
    private Integer displayOrder;
    /** 状态 @see CommonStatusEnum */
    private String status;
    /** 创建时间 */
    private LocalDateTime createTime;
    /** 更新时间 */
    private LocalDateTime updateTime;
}
