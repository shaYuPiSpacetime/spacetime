package com.spacetime.admin.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 校园代理二维码响应
 */
@Data
public class PromotionAgentQrCodeVO {
    private Long id;
    private Long agentId;
    private String agentNo;
    private String agentName;
    private String qrCode;
    private String miniappPath;
    private String qrUrl;
    private String materialUrl;
    private String materialTemplate;
    private String validityText;
    private Integer versionNo;
    private String status;
    private LocalDateTime createTime;
}
