package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 校园代理二维码表
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("promotion_agent_qr_code")
public class PromotionAgentQrCode extends BaseEntity {
    /** 代理ID */
    private Long agentId;
    /** 永久二维码令牌 */
    private String qrToken;
    /** 小程序路径 */
    private String miniappPath;
    /** 二维码图片公网地址 */
    private String imageUrl;
}
