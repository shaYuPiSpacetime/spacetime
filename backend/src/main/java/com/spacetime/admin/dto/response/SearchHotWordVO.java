package com.spacetime.admin.dto.response;

import lombok.Data;

/**
 * 搜索热词视图对象
 */
@Data
public class SearchHotWordVO {
    /** 主键 ID */
    private Long id;
    /** 热词内容 */
    private String word;
    /** 适用场景 */
    private String scene;
    /** 排序号 */
    private Integer sort;
    /** 状态 */
    private String status;
    /** 创建时间 */
    private String createTime;
}
