package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 代理专属码表
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("promotion_agent_code")
public class PromotionAgentCode extends BaseEntity {
    /** 代理ID */
    private Long agentId;
    /** 代理专属码 */
    private String agentCode;
    /** 小程序路径 */
    private String miniappPath;
    /** 二维码OSS地址 */
    private String qrUrl;
    /** 海报OSS地址 */
    private String posterUrl;
    /** 版本号 */
    private Integer versionNo;
    /** 状态 */
    private String status;
}
