package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * VIP 状态响应
 */
@Data
public class VipStatusVO {
    /** VIP 状态 */
    private String vipStatus;
    /** VIP 到期时间 */
    private LocalDateTime vipExpireTime;
}
