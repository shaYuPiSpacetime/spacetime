package com.spacetime.admin.dto.response;

import lombok.Data;

/**
 * 代理码响应
 */
@Data
public class PromotionAgentCodeVO {
    private Long id;
    private Long agentId;
    private String agentCode;
    private String miniappPath;
    private String qrUrl;
    private String posterUrl;
    private Integer versionNo;
    private String status;
}
