package com.spacetime.miniapp.dto.response;

import lombok.Data;

/**
 * 来源追踪响应。
 */
@Data
public class InviteSourceTraceVO {
    private Long id;
    private String traceNo;
    private String sourceType;
    private String bindStatus;
}
