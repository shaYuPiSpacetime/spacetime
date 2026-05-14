package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 字典类型创建请求
 */
@Data
public class DictTypeCreateReq {
    /** 字典名称 */
    @NotNull(message = "字典名称不能为空")
    @NotBlank(message = "字典名称不能为空")
    private String dictName;
    /** 字典类型编码（唯一） */
    @NotNull(message = "字典类型编码不能为空")
    @NotBlank(message = "字典类型编码不能为空")
    private String dictType;
    /** 排序号 */
    private Integer dictSort;
    /** 状态：ENABLED=启用 / DISABLED=禁用 */
    private String status;
    /** 备注 */
    private String remark;
}
