package com.spacetime.common.dto;

import lombok.Data;

/**
 * 分页请求基类，所有分页查询请求继承此类
 * 默认第1页、每页20条，最大每页100条
 */
@Data
public class PageReq {
    /** 页码，从1开始 */
    private int page = 1;
    /** 每页条数 */
    private int size = 20;

    /** 限制最大每页 100 条，防止恶意全表扫描 */
    public int getSize() {
        return Math.min(size, 100);
    }
}
