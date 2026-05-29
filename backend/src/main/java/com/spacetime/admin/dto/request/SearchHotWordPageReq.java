package com.spacetime.admin.dto.request;

import com.spacetime.common.dto.PageReq;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 搜索热词分页查询请求
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class SearchHotWordPageReq extends PageReq {
    /** 热词内容（模糊搜索） */
    private String word;
    /** 适用场景 */
    private String scene;
    /** 状态 */
    private String status;
}
