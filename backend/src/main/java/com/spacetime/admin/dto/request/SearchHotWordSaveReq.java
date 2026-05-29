package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 搜索热词新增/编辑请求
 */
@Data
public class SearchHotWordSaveReq {
    /** 热词内容 */
    @NotBlank(message = "热词不能为空")
    @Size(max = 30, message = "热词长度不能超过30个字符")
    private String word;
    /** 适用场景 */
    private String scene;
    /** 排序号 */
    private Integer sort;
    /** 状态 */
    @NotBlank(message = "状态不能为空")
    private String status;
}
