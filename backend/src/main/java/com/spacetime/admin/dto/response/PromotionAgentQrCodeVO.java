package com.spacetime.admin.dto.response;

import lombok.Data;

/**
 * 校园代理二维码响应
 */
@Data
public class PromotionAgentQrCodeVO {
    private Long id;
    private Long agentId;
    private String qrCode;
    private String miniappPath;
    private String qrUrl;
    private String materialUrl;
    private Integer versionNo;
    private String status;
}
