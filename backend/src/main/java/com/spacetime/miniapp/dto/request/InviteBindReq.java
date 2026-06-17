package com.spacetime.miniapp.dto.request;

import lombok.Data;

/**
 * 绑定邀请关系请求。
 */
@Data
public class InviteBindReq {
    private String traceNo;
    private String inviteCode;
    private String qrCode;
}
