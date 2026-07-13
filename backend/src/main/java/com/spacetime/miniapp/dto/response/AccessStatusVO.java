package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.util.List;

/**
 * 移动端准入能力状态。
 */
@Data
public class AccessStatusVO {
    /** 是否可浏览卡片。 */
    private Boolean canBrowseCards;
    /** 是否可发起匹配。 */
    private Boolean canMatch;
    /** 是否可发起私信或匹配会话。 */
    private Boolean canMessage;
    /** 是否可进入非核心社区能力。 */
    private Boolean canCommunity;
    /** 是否可被其他用户曝光。 */
    private Boolean canBeExposed;
    /** 核心准入状态：CORE_ALLOWED、CORE_BLOCKED、NON_CORE_ONLY。 */
    private String coreAccessStatus;
    /** 多条阻断原因，供移动端逐项渲染。 */
    private List<String> blockReasons;
}
