package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

/** 已成功渲染的悄悄话批次。 */
@Data
public class WhisperReadBatchReq {
    @NotEmpty(message = "悄悄话编号不能为空")
    @Size(max = 50, message = "单次最多确认50条悄悄话")
    private List<@NotBlank(message = "悄悄话编号不能为空") String> whisperNos;
}
