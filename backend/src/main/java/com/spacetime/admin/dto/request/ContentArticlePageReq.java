package com.spacetime.admin.dto.request;

import com.spacetime.common.dto.PageReq;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 内容文章分页查询请求
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class ContentArticlePageReq extends PageReq {
    /** 文章类型 */
    private String type;
    /** 子分类 */
    private String category;
    /** 标题（模糊搜索） */
    private String title;
    /** 状态 */
    private String status;
}
