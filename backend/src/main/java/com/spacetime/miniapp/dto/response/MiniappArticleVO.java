package com.spacetime.miniapp.dto.response;

import lombok.Data;

/**
 * 小程序文章列表视图对象
 */
@Data
public class MiniappArticleVO {
    /** 文章 ID */
    private Long id;
    /** 文章类型 */
    private String type;
    /** 子分类 */
    private String category;
    /** 标题 */
    private String title;
    /** 摘要 */
    private String summary;
    /** 封面图 URL */
    private String coverUrl;
    /** 内容类型 */
    private String contentType;
    /** H5 跳转地址 */
    private String contentUrl;
    /** 排序号 */
    private Integer sort;
    /** 创建时间 */
    private String createTime;
}
