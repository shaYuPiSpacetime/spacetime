package com.spacetime.miniapp.dto.response;

import lombok.Data;

/**
 * 二维码来源解析响应。
 */
@Data
public class InviteQrSourceVO {
    private Boolean available;
    private String qrCode;
    private String miniappPath;
}
