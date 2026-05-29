package com.spacetime.admin.dto.response;

import lombok.Data;

/**
 * 内容文章视图对象
 */
@Data
public class ContentArticleVO {
    /** 主键 ID */
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
    /** 原生内容正文 */
    private String contentBody;
    /** 排序号 */
    private Integer sort;
    /** 状态 */
    private String status;
    /** 生效时间 */
    private String effectiveTime;
    /** 失效时间 */
    private String expireTime;
    /** 创建时间 */
    private String createTime;
}
