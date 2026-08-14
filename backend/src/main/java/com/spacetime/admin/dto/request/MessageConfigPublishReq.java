package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** 发布消息普通规则版本。 */
@Data
public class MessageConfigPublishReq {
    @NotBlank(message = "期望版本不能为空")
    private String expectedVersion;
    @NotBlank(message = "变更说明不能为空")
    @Size(min = 5, max = 100, message = "变更说明长度必须为5-100个字符")
    private String remark;
    @NotNull private Boolean femaleProtectionEnabled;
    @NotNull @Min(1) @Max(30) private Integer femaleProtectionDays;
    @NotNull @Min(1) @Max(30) private Integer whisperExpireDays;
    @NotNull @Min(1) @Max(30) private Integer whisperCooldownDays;
    @NotNull @Min(30) @Max(3650) private Integer ordinaryMessageRetainDays;
    @NotNull @Min(30) @Max(3650) private Integer systemMessageVisibleDays;
    @NotNull @Min(180) @Max(3650) private Integer reportEvidenceRetainDays;
    @NotNull @Min(180) @Max(3650) private Integer severeEvidenceRetainDays;
    @NotNull @Min(180) @Max(3650) private Integer sensitiveAuditRetainDays;
}
