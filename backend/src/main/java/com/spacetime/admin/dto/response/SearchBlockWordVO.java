package com.spacetime.admin.dto.response;

import lombok.Data;

/**
 * 搜索屏蔽词视图对象
 */
@Data
public class SearchBlockWordVO {
    /** 主键 ID */
    private Long id;
    /** 屏蔽词内容 */
    private String word;
    /** 屏蔽类型 */
    private String blockType;
    /** 匹配类型 */
    private String matchType;
    /** 屏蔽原因字典值 */
    private String reasonCode;
    /** 命中提示文案 */
    private String hitMessage;
    /** 状态 */
    private String status;
    /** 备注 */
    private String remark;
    /** 创建时间 */
    private String createTime;
}
