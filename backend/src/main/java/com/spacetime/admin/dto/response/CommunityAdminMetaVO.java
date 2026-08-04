package com.spacetime.admin.dto.response;

import lombok.Data;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** 管理端社区页面元数据。 */
@Data
public class CommunityAdminMetaVO {
    private Map<String, List<CommunityMetaOptionVO>> options = new LinkedHashMap<>();
    private Map<String, String> copy = new LinkedHashMap<>();
    private Map<String, Boolean> capabilities = new LinkedHashMap<>();
    private Integer configVersion;
}
