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
    /** 校园代理二维码编号 */
    private String qrCode;
    /** 小程序路径 */
    private String miniappPath;
    /** 二维码OSS地址 */
    private String qrUrl;
    /** 二维码素材OSS地址 */
    private String materialUrl;
    /** 版本号 */
    private Integer versionNo;
    /** 状态 */
    private String status;
}
