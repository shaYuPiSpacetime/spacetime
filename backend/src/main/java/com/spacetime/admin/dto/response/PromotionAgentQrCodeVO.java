package com.spacetime.admin.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 校园推广员永久二维码响应。
 */
@Data
public class PromotionAgentQrCodeVO {
    private String agentNo;
    private String qrToken;
    private String miniappPath;
    private String imageUrl;
    private LocalDateTime createdAt;
}
