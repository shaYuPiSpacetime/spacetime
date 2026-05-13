package com.spacetime.admin.dto.response;

import lombok.Data;

import java.util.List;

/**
 * 前端路由节点响应体（动态侧边栏用）
 */
@Data
public class RouterVO {
    /** 菜单 ID */
    private Long id;
    /** 父菜单 ID */
    private Long parentId;
    /** 路由名称（对应组件 name） */
    private String name;
    /** 路由路径 */
    private String path;
    /** 前端组件路径 */
    private String component;
    /** 元信息（标题、图标） */
    private MetaVO meta;
    /** 排序号 */
    private Integer sort;
    /** 子路由列表 */
    private List<RouterVO> children;
}
