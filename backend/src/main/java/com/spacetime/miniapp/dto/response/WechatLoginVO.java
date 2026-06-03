package com.spacetime.miniapp.dto.response;

import lombok.Data;

/**
 * 微信授权登录响应
 */
@Data
public class WechatLoginVO {
    /** 登录凭证，有效期7天 */
    private String token;
    /** 用户ID */
    private Long userId;
    /** 是否已完成首登资料初始化 */
    private Boolean firstLoginCompleted;
}
