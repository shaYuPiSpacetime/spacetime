package com.spacetime.admin.dto.request;

import com.spacetime.common.dto.PageReq;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDateTime;

/** 管理后台消息元数据筛选。 */
@Data
@EqualsAndHashCode(callSuper = true)
public class MessageRecordPageReq extends PageReq {
    private String keyword;
    private String recordType;
    private String messageType;
    private String systemCategory;
    private String status;
    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime startTime;
    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime endTime;
}
