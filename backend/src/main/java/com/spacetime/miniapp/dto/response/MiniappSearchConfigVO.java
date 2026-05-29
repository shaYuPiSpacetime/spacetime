package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.util.List;

/**
 * 小程序搜索配置视图对象
 */
@Data
public class MiniappSearchConfigVO {
    /** 空状态提示文案 */
    private String emptyStateText;
    /** 违规提示文案 */
    private String violationText;
    /** 默认排序方式 */
    private String defaultSort;
    /** 搜索结果 Tab 列表 */
    private List<MiniappEntryConfigVO> tabs;
}
