package com.spacetime.miniapp.dto.response;

import lombok.Data;

/**
 * 添加头像响应。
 */
@Data
public class AvatarSubmitVO {

    /** 本次头像审核记录 ID。 */
    private Long auditRecordId;
    /** 审核状态：提交成功后为 PENDING。 */
    private String auditStatus;
    /** 审核来源：MACHINE、MANUAL。 */
    private String auditSource;
}
