package com.spacetime.admin.dto.request;

import com.spacetime.common.dto.PageReq;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * 成家币流水（金币流水）分页查询请求
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class FlowPageReq extends PageReq {
    /** 用户 ID */
    private Long userId;
    /** 流水类型 */
    private String flowType;
    /** 业务场景 */
    private String bizScene;
    /** 开始时间 */
    private LocalDateTime startTime;
    /** 结束时间 */
    private LocalDateTime endTime;
}
