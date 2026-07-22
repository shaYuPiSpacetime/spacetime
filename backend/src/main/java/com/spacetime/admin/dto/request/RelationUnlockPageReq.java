package com.spacetime.admin.dto.request;

import lombok.Data;
import lombok.EqualsAndHashCode;

/** 管理后台单条解锁记录查询条件。 */
@Data
@EqualsAndHashCode(callSuper = true)
public class RelationUnlockPageReq extends RelationPageReq {
    /** 解锁业务编号，供关系记录跳转后精确定位。 */
    private String unlockNo;
}
