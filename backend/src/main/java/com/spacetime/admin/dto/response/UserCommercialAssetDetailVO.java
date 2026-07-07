package com.spacetime.admin.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 用户商业化资产详情响应
 */
@Data
public class UserCommercialAssetDetailVO {
    /** 用户 ID */
    private Long userId;
    /** 用户昵称 */
    private String nickname;
    /** 手机号 */
    private String phone;
    /** 头像 */
    private String avatar;
    /** VIP 状态 */
    private String vipStatus;
    /** VIP 到期时间 */
    private LocalDateTime vipExpireTime;
    /** 千寻币余额 */
    private Integer coinBalance;
    /** 今日剩余免费悄悄话 */
    private Integer todayFreeWhisperRemain;
    /** 累计充值金额 */
    private BigDecimal totalRecharge;
    /** 最近订单 */
    private List<TradeOrderVO> recentOrders;
    /** 最近流水 */
    private List<CoinFlowVO> recentFlows;
    /** 最近退款 */
    private List<RefundRecordVO> recentRefunds;
}
