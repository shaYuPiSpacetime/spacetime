package com.spacetime.admin.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 字典类型视图对象
 */
@Data
public class DictTypeVO {
    /** 主键 ID */
    private Long id;
    /** 字典名称 */
    private String dictName;
    /** 字典类型编码 */
    private String dictType;
    /** 排序号 */
    private Integer dictSort;
    /** 状态：ENABLED=启用 / DISABLED=禁用 */
    private String status;
    /** 备注 */
    private String remark;
    /** 创建时间 */
    private LocalDateTime createTime;
}
