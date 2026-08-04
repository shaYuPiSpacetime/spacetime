package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.Map;

@Data
public class CommunityExportCreateReq {
    @NotBlank private String exportType;
    private Map<String, Object> filters;
}
