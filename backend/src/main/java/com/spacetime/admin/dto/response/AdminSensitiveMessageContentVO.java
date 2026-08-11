package com.spacetime.admin.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/** App 用户消息互动中的受控高敏正文响应。 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminSensitiveMessageContentVO {
    private String accessNo;
    private String targetType;
    private String targetNo;
    private List<AdminSensitiveContentItemVO> items;
}
