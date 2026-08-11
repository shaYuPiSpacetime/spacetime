package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

/** 发布系统消息或官方助手模板版本。 */
@Data
public class MessageTemplatePublishReq {
    private String expectedVersion;
    @NotBlank private String bizType;
    @NotBlank private String notificationType;
    @NotBlank @Size(max = 256) private String titleTemplate;
    @NotBlank @Size(max = 4000) private String contentTemplate;
    @NotNull private List<String> allowedVariables;
    @NotBlank private String jumpType;
    @Size(max = 500) private String jumpValueTemplate;
    @NotNull private Boolean safetyRequired;
    @NotBlank @Size(min = 5, max = 200) private String remark;
}
