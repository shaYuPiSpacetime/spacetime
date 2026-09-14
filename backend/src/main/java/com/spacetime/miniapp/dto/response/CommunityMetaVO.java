package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** 小程序社区动态字典、配置和文案聚合。 */
@Data
public class CommunityMetaVO {
    private Map<String, List<DictOptionVO>> dictionaries = new LinkedHashMap<>();
    private Map<String, String> copies = new LinkedHashMap<>();
    private Map<String, Object> configs = new LinkedHashMap<>();
    /** 当前用户派生能力，不包含私有配置原文。 */
    private Map<String, Boolean> capabilities = new LinkedHashMap<>();
    private List<MiniappEntryConfigVO> homeTabs;
}
