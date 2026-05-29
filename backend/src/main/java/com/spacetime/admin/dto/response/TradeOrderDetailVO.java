package com.spacetime.admin.dto.response;

import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 交易订单详情响应（含用户信息）
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class TradeOrderDetailVO extends TradeOrderVO {
    /** 用户昵称 */
    private String userNickname;
    /** 用户手机号 */
    private String userPhone;
    /** 用户头像 */
    private String userAvatar;
}
