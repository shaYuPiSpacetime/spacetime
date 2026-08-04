package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CommunityTopicStatusReq {
    @NotBlank private String status;
    @NotNull private Integer version;
    private String remark;
}
