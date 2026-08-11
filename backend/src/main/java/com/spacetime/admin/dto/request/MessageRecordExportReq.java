package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.AssertTrue;
import lombok.Data;
import lombok.EqualsAndHashCode;

/** 消息元数据固定字段导出请求。 */
@Data
@EqualsAndHashCode(callSuper = true)
public class MessageRecordExportReq extends MessageRecordPageReq {
    @AssertTrue(message = "必须确认导出文件不包含消息正文")
    private boolean confirmNoContent;
}
