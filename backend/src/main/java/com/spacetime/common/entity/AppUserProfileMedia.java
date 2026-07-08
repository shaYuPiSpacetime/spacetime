package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * App 用户资料媒体审核记录。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_user_profile_media")
public class AppUserProfileMedia extends BaseEntity {
    private Long userId;
    private String mediaType;
    private String mediaUrl;
    private String thumbUrl;
    private Integer sortOrder;
    private String auditStatus;
    private String auditSource;
    private Long providerTaskId;
    private String machineSignalJson;
    private String rejectReason;
    private Boolean currentEffective;
}
