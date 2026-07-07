package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 千寻币消费场景配置
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_coin_scene_config")
public class CoinSceneConfig extends BaseEntity {
    /** 场景编码 */
    private String sceneCode;
    /** 移动端名称 */
    private String mobileName;
    /** 移动端图标 */
    private String mobileIcon;
    /** 场景说明 */
    private String sceneDesc;
    /** 单价，单位：千寻币 */
    private Integer unitPrice;
    /** 保留期天数，0 表示永久 */
    private Integer retentionDays;
    /** 展示排序 */
    private Integer sortOrder;
    /** 状态: ENABLED/DISABLED */
    private String status;
}
