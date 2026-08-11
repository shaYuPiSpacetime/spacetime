package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

/** 已成功渲染的官方助手消息批次。 */
@Data
public class AssistantMessageReadBatchReq {
    @NotEmpty(message = "助手消息编号不能为空")
    @Size(max = 50, message = "单次最多确认50条助手消息")
    private List<@NotBlank(message = "助手消息编号不能为空") String> messageNos;
}
