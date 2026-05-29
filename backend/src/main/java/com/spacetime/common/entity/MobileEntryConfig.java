package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 移动端入口配置实体
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("mobile_entry_config")
public class MobileEntryConfig extends BaseEntity {
    /** 页面编码 @see com.spacetime.common.enums.MobilePageCodeEnum */
    private String pageCode;
    /** 入口稳定业务键 */
    private String entryKey;
    /** 入口展示名称 */
    private String entryName;
    /** 入口图标标识 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String icon;
    /** 跳转类型 @see com.spacetime.common.enums.JumpTypeEnum */
    private String jumpType;
    /** 跳转目标 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String jumpTarget;
    /** 角标文案 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String badgeText;
    /** 角标类型 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String badgeType;
    /** 是否需要登录：0=否，1=是 */
    private Integer loginRequired;
    /** 排序号 */
    private Integer sort;
    /** 状态 @see com.spacetime.common.enums.CommonStatusEnum */
    private String status;
    /** 扩展 JSON */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String extraJson;
}
