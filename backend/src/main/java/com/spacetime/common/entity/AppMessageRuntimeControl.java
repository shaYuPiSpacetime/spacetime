package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/** 消息发送即时安全总开关。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_message_runtime_control")
public class AppMessageRuntimeControl extends BaseEntity {
    private String controlKey;
    private Integer enabled;
    private Integer version;
    private String reason;
    private Long changedBy;
    private LocalDateTime changedAt;
}
