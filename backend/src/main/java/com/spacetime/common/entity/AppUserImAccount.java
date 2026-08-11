package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/** 平台用户与腾讯云 TIM 用户账号稳定映射。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_user_im_account")
public class AppUserImAccount extends BaseEntity {
    private Long userId;
    private String imUserId;
    private String syncStatus;
    private LocalDateTime syncedAt;
    private LocalDateTime disabledAt;
    private String lastErrorCode;
    private String lastErrorSummary;
    private Integer version;
}
