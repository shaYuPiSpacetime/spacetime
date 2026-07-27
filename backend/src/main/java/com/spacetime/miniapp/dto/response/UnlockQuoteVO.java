package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** 单条关系记录解锁报价。 */
@Data
public class UnlockQuoteVO {
    private String quoteToken;
    private String scene;
    private String targetBizType;
    private String targetBizNo;
    /** 未购买时不返回，防止通过报价接口识别模糊用户。 */
    private Long targetUserId;
    private Integer unitPrice;
    private Integer coinBalance;
    private Boolean alreadyUnlocked;
    private LocalDateTime expireAt;
}
