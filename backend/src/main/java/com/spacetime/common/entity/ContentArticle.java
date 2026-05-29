package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * 公共内容文章实体
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("content_article")
public class ContentArticle extends BaseEntity {
    /** 文章类型 @see com.spacetime.common.enums.ArticleTypeEnum */
    private String type;
    /** 子分类 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String category;
    /** 标题 */
    private String title;
    /** 摘要 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String summary;
    /** 封面图 URL */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String coverUrl;
    /** 内容类型 @see com.spacetime.common.enums.ContentTypeEnum */
    private String contentType;
    /** H5 跳转地址 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String contentUrl;
    /** 原生内容正文 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String contentBody;
    /** 排序号 */
    private Integer sort;
    /** 状态 @see com.spacetime.common.enums.CommonStatusEnum */
    private String status;
    /** 生效时间 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private LocalDateTime effectiveTime;
    /** 失效时间 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private LocalDateTime expireTime;
}
