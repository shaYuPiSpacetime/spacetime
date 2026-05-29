package com.spacetime.miniapp.dto.response;

import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 小程序文章详情视图对象，包含正文内容
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class MiniappArticleDetailVO extends MiniappArticleVO {
    /** 原生内容正文 */
    private String contentBody;
}
