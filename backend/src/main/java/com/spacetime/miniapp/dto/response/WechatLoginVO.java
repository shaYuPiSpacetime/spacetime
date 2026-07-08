package com.spacetime.miniapp.dto.response;

import lombok.Data;

/**
 * 登录响应，微信登录和手机号登录共用同一返回结构。
 */
@Data
public class WechatLoginVO {
    /** 登录 token，写入 Redis 后返回给移动端。 */
    private String token;

    /** App 用户 ID。 */
    private Long userId;

    /** 本次登录是否创建了新用户。 */
    private Boolean isNewUser;

    /** 是否已完成首登资料初始化。 */
    private Boolean firstLoginCompleted;

    /** 下一步首登资料步骤；已完成首登时为空。 */
    private Integer nextStep;

    /** 登录后立即可用的准入能力状态。 */
    private AccessStatusVO accessStatus;
}
