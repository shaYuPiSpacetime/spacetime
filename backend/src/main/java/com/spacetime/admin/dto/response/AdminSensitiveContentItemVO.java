package com.spacetime.admin.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** 一条经授权返回的高敏消息正文。 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminSensitiveContentItemVO {
    private String role;
    private String messageNo;
    private String messageType;
    private String content;
    private LocalDateTime eventTime;
}
