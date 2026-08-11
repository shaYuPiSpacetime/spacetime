package com.spacetime.miniapp.dto.response;

import lombok.Data;

/** 小程序登录腾讯云 TIM 所需的短期凭证。 */
@Data
public class ImCredentialVO {
    private Long sdkAppId;
    private String imUserId;
    private String userSig;
    private String expireAt;
    private Integer protocolVersion;
}
