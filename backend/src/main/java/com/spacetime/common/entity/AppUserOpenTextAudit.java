package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_user_open_text_audit")
public class AppUserOpenTextAudit extends BaseEntity {
    private Long userId;
    private String fieldName;
    private String contentText;
    private String contentHash;
    private String auditStatus;
    private String auditSource;
    private Long providerTaskId;
    private String machineSignalJson;
    private String rejectReason;
    private LocalDateTime submitTime;
    private LocalDateTime auditTime;
    private Boolean currentEffective;
}
