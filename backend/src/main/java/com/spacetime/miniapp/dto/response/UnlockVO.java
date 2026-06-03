package com.spacetime.miniapp.dto.response;

import lombok.Data;

/**
 * 解锁响应
 */
@Data
public class UnlockVO {
    /** 解锁数量 */
    private Integer unlockedCount;
    /** 消耗成家币 */
    private Integer coinCost;
}
