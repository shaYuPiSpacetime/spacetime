package com.spacetime.admin.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

/**
 * 移动端入口排序请求
 */
@Data
public class MobileEntrySortReq {
    /** 排序项列表 */
    @NotNull(message = "排序列表不能为空")
    @Size(min = 1, message = "至少包含一个排序项")
    @Valid
    private List<SortItem> items;

    /**
     * 单个排序项
     */
    @Data
    public static class SortItem {
        /** 入口 ID */
        @NotNull(message = "ID 不能为空")
        private Long id;
        /** 排序号 */
        @NotNull(message = "排序号不能为空")
        private Integer sort;
    }
}
