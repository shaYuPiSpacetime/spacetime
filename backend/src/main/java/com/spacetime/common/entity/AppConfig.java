package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 应用配置实体
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_config")
public class AppConfig extends BaseEntity {
    /** 配置键 */
    private String configKey;
    /** 配置值 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String configValue;
    /** 配置分组 @see com.spacetime.common.enums.ConfigGroupEnum */
    private String configGroup;
    /** 配置类型 @see com.spacetime.common.enums.ConfigTypeEnum */
    private String configType;
    /** 是否允许小程序公共接口返回：0=否，1=是 */
    private Integer publicVisible;
    /** 状态 @see com.spacetime.common.enums.CommonStatusEnum */
    private String status;
    /** 备注 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String remark;
}
