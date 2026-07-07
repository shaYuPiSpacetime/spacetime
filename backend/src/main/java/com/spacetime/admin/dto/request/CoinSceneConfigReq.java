package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 千寻币消费场景配置请求
 */
@Data
public class CoinSceneConfigReq {
    /** 场景 ID，新增时为空 */
    private Long id;
    /** 场景编码 */
    @NotBlank(message = "场景编码不能为空")
    private String sceneCode;
    /** 移动端名称 */
    @NotBlank(message = "移动端名称不能为空")
    private String mobileName;
    /** 移动端图标 */
    private String mobileIcon;
    /** 场景说明 */
    private String sceneDesc;
    /** 单价，单位：千寻币 */
    @NotNull(message = "场景单价不能为空")
    private Integer unitPrice;
    /** 保留期天数，0 表示永久 */
    private Integer retentionDays;
    /** 展示排序 */
    private Integer sortOrder;
    /** 状态 */
    private String status;
}
