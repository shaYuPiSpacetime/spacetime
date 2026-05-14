package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 字典数据实体（支持多层级）
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("sys_dict_data")
public class SysDictData extends BaseEntity {
    /** 所属字典类型编码 */
    private String dictType;
    /** 父级 ID（0=顶级） */
    private Long parentId;
    /** 字典标签（显示文本） */
    private String dictLabel;
    /** 字典键值（存储值） */
    private String dictValue;
    /** 排序号 */
    private Integer dictSort;
    /** 状态 @see CommonStatusEnum */
    private String status;
    /** 备注 */
    private String remark;
}
