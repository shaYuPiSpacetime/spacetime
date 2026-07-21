package com.spacetime.admin.dto.response;

import lombok.Data;

import java.util.List;

@Data
public class AdminCancelRequestVO {
    private Long id;
    private String requestNo;
    private Long userId;
    private String userCode;
    private String nickname;
    private String phone;
    private String status;
    private String reason;
    private String blockReason;
    private List<String> blockReasons;
    private String remark;
    private List<String> remarks;
    private String vipRisk;
    private String refundRisk;
    private Integer coinBalance;
    private String executionLog;
    private String coolingEndTime;
    private String revokedTime;
    private String finalCancelTime;
    private String createTime;
}
