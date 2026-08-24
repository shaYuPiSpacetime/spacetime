package com.spacetime.miniapp.dto.response;

import lombok.Data;

/**
 * 添加头像响应。
 */
@Data
public class AvatarSubmitVO {

    /** 本次头像审核记录 ID。 */
    private Long auditRecordId;
    /** 审核状态：待送审为 PENDING，三方异步受理后为 REVIEWING。 */
    private String auditStatus;
    /** 审核来源：MACHINE、MANUAL。 */
    private String auditSource;
}
