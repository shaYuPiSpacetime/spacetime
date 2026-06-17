package com.spacetime.miniapp.dto.request;

import lombok.Data;

/**
 * 分享/扫码来源记录请求。
 */
@Data
public class InviteShareLogReq {
    private String traceNo;
    private String sourceType;
    private Long inviterId;
    private String inviteCode;
    private Long agentId;
    private String qrCode;
    private Long visitorUserId;
    private String scene;
    private String deviceHash;
    private String ip;
}
