package com.spacetime.miniapp.dto.response;

import lombok.Data;

/**
 * 核心准入状态响应
 * 控制用户在平台上的三种能力：浏览卡片、匹配、被曝光
 */
@Data
public class AccessStatusVO {
    /** 是否可浏览卡片 */
    private Boolean canBrowseCards;
    /** 是否可匹配 */
    private Boolean canMatch;
    /** 是否可被他人曝光 */
    private Boolean canBeExposed;
    /** 阻断原因（可操作时为 null） */
    private String blockReason;
}
