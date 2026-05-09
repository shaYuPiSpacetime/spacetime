package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 实体基类，所有数据库实体继承此类
 * 提供通用字段：id、创建时间、更新时间、创建人、更新人、逻辑删除
 */
@Data
public class BaseEntity {
    /** 自增主键 */
    @TableId(type = IdType.AUTO)
    private Long id;

    /** 创建时间（自动填充） */
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    /** 更新时间（自动填充） */
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;

    /** 创建人 ID（自动填充） */
    @TableField(fill = FieldFill.INSERT)
    private Long createdBy;

    /** 更新人 ID（自动填充） */
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private Long updatedBy;

    /** 逻辑删除标记：0=正常，1=已删除 */
    @TableLogic
    private Integer deleted;
}
