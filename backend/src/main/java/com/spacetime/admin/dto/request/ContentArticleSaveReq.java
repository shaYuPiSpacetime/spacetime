package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 内容文章新增/编辑请求
 */
@Data
public class ContentArticleSaveReq {
    /** 文章类型 */
    @NotBlank(message = "文章类型不能为空")
    private String type;
    /** 子分类 */
    private String category;
    /** 标题 */
    @NotBlank(message = "标题不能为空")
    private String title;
    /** 摘要 */
    private String summary;
    /** 封面图 URL */
    private String coverUrl;
    /** 内容类型 */
    @NotBlank(message = "内容类型不能为空")
    private String contentType;
    /** H5 跳转地址 */
    private String contentUrl;
    /** 原生内容正文 */
    private String contentBody;
    /** 排序号 */
    private Integer sort;
    /** 状态 */
    private String status;
    /** 生效时间 yyyy-MM-dd HH:mm:ss */
    private String effectiveTime;
    /** 失效时间 yyyy-MM-dd HH:mm:ss */
    private String expireTime;
}
