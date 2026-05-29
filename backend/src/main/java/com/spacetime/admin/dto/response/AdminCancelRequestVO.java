package com.spacetime.admin.dto.response;

import lombok.Data;

@Data
public class AdminCancelRequestVO {
    private Long id;
    private Long userId;
    private String nickname;
    private String status;
    private String reason;
    private String blockReason;
    private String remark;
    private String coolingEndTime;
    private String revokedTime;
    private String finalCancelTime;
    private String createTime;
}
