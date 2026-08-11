package com.spacetime.common.model.message;

import lombok.Data;

import java.time.LocalDateTime;

/** 后台消息元数据统一查询条件。 */
@Data
public class MessageAdminRecordFilter {
    private String keyword;
    private String recordType;
    private String messageType;
    private String systemCategory;
    private String status;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
}
