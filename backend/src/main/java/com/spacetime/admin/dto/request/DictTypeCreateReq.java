package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
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
    @Pattern(regexp = "ENABLED|DISABLED", message = "状态只能是ENABLED或DISABLED")
    private String status;
    /** 备注 */
    private String remark;
}
