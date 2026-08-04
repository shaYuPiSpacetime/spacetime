package com.spacetime.admin.dto.response;

import lombok.Data;

import java.util.List;

/** 社区配置分区。 */
@Data
public class CommunityConfigSectionVO {
    private String code;
    private String name;
    private String description;
    private List<CommunityConfigItemVO> items;
}
