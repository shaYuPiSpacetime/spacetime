package com.spacetime.admin.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** 消息运行时全局开关。 */
@Data
public class MessageRuntimeControlVO {
    private String controlKey;
    private Boolean enabled;
    private Integer version;
    private String reason;
    private Long changedBy;
    private LocalDateTime changedAt;
}
