package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 字典类型实体
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("sys_dict_type")
public class SysDictType extends BaseEntity {
    /** 字典名称 */
    private String dictName;
    /** 字典类型编码（唯一），如 gender, member_level */
    private String dictType;
    /** 排序号 */
    private Integer dictSort;
    /** 状态 @see CommonStatusEnum */
    private String status;
    /** 备注 */
    private String remark;
}
