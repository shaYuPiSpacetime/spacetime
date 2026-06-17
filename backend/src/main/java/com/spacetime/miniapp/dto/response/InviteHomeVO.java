package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * 邀请首页响应。
 */
@Data
public class InviteHomeVO {
    private Integer successInviteCount;
    private BigDecimal arrivedCoin;
    private String nextLadderText;
    private String coinUsage;
    private InviteQrCodeVO qrCode;
    private String miniPath;
    private List<InviteRecordVO> recentRecords;
}
