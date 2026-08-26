package com.spacetime.miniapp.dto.response;

import lombok.Data;

/** 微信用户是否使用过小程序；首次使用时同时返回可续填资料的会话。 */
@Data
public class WechatUsageVO {
    private Boolean usedBefore;
    private WechatLoginVO provisionalLogin;
}
