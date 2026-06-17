package com.spacetime.miniapp.dto.response;

import lombok.Data;

/**
 * 普通用户二维码响应。
 */
@Data
public class InviteQrCodeVO {
    private String materialUrl;
    private String qrUrl;
    private String miniappPath;
}
