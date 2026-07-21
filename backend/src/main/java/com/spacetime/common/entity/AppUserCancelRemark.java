package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 注销申请追加备注。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_user_cancel_remark")
public class AppUserCancelRemark extends BaseEntity {
    private Long requestId;
    private Long userId;
    private Long operatorId;
    private String remark;
}
