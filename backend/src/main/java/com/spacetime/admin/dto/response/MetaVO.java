package com.spacetime.admin.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * 路由元信息
 */
@Data
@AllArgsConstructor
public class MetaVO {
    /** 页面标题 */
    private String title;
    /** 图标名称 */
    private String icon;
}
