package com.spacetime.admin.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 千寻币消费场景配置响应
 */
@Data
public class CoinSceneConfigVO {
    /** 主键 ID */
    private Long id;
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
    /** 保留期天数 */
    private Integer retentionDays;
    /** 展示排序 */
    private Integer sortOrder;
    /** 状态 */
    private String status;
    /** 创建时间 */
    private LocalDateTime createTime;
    /** 更新时间 */
    private LocalDateTime updateTime;
}
