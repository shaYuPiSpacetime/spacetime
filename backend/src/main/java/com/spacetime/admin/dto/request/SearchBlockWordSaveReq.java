package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 搜索屏蔽词新增/编辑请求
 */
@Data
public class SearchBlockWordSaveReq {
    /** 屏蔽词内容 */
    @NotBlank(message = "屏蔽词不能为空")
    @Size(max = 50, message = "屏蔽词长度不能超过50个字符")
    private String word;
    /** 屏蔽类型 */
    @NotBlank(message = "屏蔽类型不能为空")
    private String blockType;
    /** 匹配类型 */
    @NotBlank(message = "匹配类型不能为空")
    private String matchType;
    /** 屏蔽原因字典值 */
    private String reasonCode;
    /** 命中提示文案 */
    private String hitMessage;
    /** 状态 */
    @NotBlank(message = "状态不能为空")
    private String status;
    /** 备注 */
    private String remark;
}
