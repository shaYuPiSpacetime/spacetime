package com.spacetime.admin.dto.request;

import com.spacetime.common.dto.PageReq;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 搜索屏蔽词分页查询请求
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class SearchBlockWordPageReq extends PageReq {
    /** 屏蔽词内容（模糊搜索） */
    private String word;
    /** 屏蔽类型 */
    private String blockType;
    /** 状态 */
    private String status;
}
