package com.spacetime.admin.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

/** 单次受控解密结果，控制器必须使用 no-store 响应。 */
@Data
@AllArgsConstructor
public class SensitiveContentVO {
    private String accessNo;
    private String evidenceNo;
    private String messageType;
    private String content;
    private LocalDateTime eventTime;
}
