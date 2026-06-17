package com.spacetime.miniapp.dto.response;

import lombok.Data;

/**
 * 邀请绑定响应。
 */
@Data
public class InviteBindVO {
    private Long relationId;
    private String relationNo;
    private String sourceType;
    private String status;
}
