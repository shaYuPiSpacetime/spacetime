package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 用户搜索日志实体
 * 注：本表只写不改，update_time/updated_by 仅为 BaseEntity 统一字段
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_user_search_log")
public class AppUserSearchLog extends BaseEntity {
    /** 用户ID */
    private Long userId;
    /** 搜索关键词（已截断，最长100字符） */
    private String keyword;
    /** 搜索类型 all/user/post/topic */
    private String searchType;
    /** 返回结果数 */
    private Integer resultCount;
    /** 是否命中违规词 1=是 0=否 */
    private Integer violation;
}
