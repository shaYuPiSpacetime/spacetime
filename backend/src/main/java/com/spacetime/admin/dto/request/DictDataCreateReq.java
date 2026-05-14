package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 字典数据创建请求
 */
@Data
public class DictDataCreateReq {
    /** 所属字典类型编码 */
    @NotNull(message = "字典类型编码不能为空")
    @NotBlank(message = "字典类型编码不能为空")
    private String dictType;
    /** 父级 ID（0=顶级） */
    private Long parentId;
    /** 字典标签（显示文本） */
    @NotNull(message = "字典标签不能为空")
    @NotBlank(message = "字典标签不能为空")
    private String dictLabel;
    /** 字典键值（存储值） */
    @NotNull(message = "字典键值不能为空")
    @NotBlank(message = "字典键值不能为空")
    private String dictValue;
    /** 排序号 */
    private Integer dictSort;
    /** 状态：ENABLED=启用 / DISABLED=禁用 */
    private String status;
    /** 备注 */
    private String remark;
}
