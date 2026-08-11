package com.spacetime.admin.dto.request;

import com.spacetime.common.dto.PageReq;
import lombok.Data;
import lombok.EqualsAndHashCode;

/** 消息模板版本分页筛选。 */
@Data
@EqualsAndHashCode(callSuper = true)
public class MessageTemplatePageReq extends PageReq {
    private String templateCode;
    private String bizType;
    private String notificationType;
    private String status;
    private Boolean currentOnly;
}
