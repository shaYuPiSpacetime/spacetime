package com.spacetime.miniapp.dto.response;

import lombok.Data;

@Data
public class MiniappAccountCancelStatusVO {
    private Long id;
    private String status;
    private String reason;
    private String blockReason;
    private String coolingEndTime;
    private Integer coolingDays;
}
