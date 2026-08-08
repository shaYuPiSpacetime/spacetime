package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/** 悄悄话发送记录。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_whisper")
public class AppWhisper extends BaseEntity {
    /** 不可枚举的悄悄话业务编号。 */
    private String whisperNo;
    /** 发送方用户 ID。 */
    private Long senderUserId;
    /** 接收方用户 ID。 */
    private Long receiverUserId;
    /** 来源动态业务编号。 */
    private String sourcePostNo;
    /** 发送入口场景。 */
    private String scene;
    /** 悄悄话正文。 */
    private String content;
    /** 本次实际扣除的千寻币数量。 */
    private Integer coinCost;
    /** 支付方式：coin/free_quota。 */
    private String paymentMethod;
    /** 发送方作用域内的客户端幂等键。 */
    private String idempotencyKey;
    /** 状态：pending。 */
    private String status;
    /** 记录失效时间，空表示永久保留。 */
    private LocalDateTime expireTime;
}
