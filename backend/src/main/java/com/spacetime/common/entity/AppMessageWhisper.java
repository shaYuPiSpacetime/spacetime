package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.spacetime.common.enums.MessageDeliveryStatusEnum;
import com.spacetime.common.enums.MessageWhisperStatusEnum;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** 悄悄话申请、回复及其转入私信会话的完整状态事实。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_message_whisper")
public class AppMessageWhisper extends BaseEntity {
    private String whisperNo;
    private String sendRequestId;
    private String replyRequestId;
    private Long senderUserId;
    private Long receiverUserId;
    private Long userLowId;
    private Long userHighId;
    /** recommendation-推荐，profile-主页，community_post-社区动态，community_comment-社区评论，whisper_reverse-反向申请。 */
    private String sourceScene;
    /** 来源帖子、评论或原悄悄话业务编号。 */
    private String sourceBizNo;
    /** @see MessageWhisperStatusEnum */
    private String status;
    private Integer activeMarker;
    private Integer version;
    private String payType;
    private String paymentStatus;
    private Integer coinAmount;
    private LocalDate benefitDate;
    private Integer quotaSnapshot;
    private String assetConsumeFlowNo;
    private String assetRefundFlowNo;
    /** @see MessageDeliveryStatusEnum */
    private String deliveryStatus;
    private String configVersion;
    private Integer expireDaysSnapshot;
    private Integer cooldownDaysSnapshot;
    private LocalDateTime expiresAt;
    private LocalDateTime cooldownUntil;
    private LocalDateTime deliveredAt;
    private LocalDateTime receiverReadAt;
    /** 接收方在小程序端逻辑隐藏时间；不改变业务状态和后台事实。 */
    private LocalDateTime receiverHiddenAt;
    /** single-单条隐藏，bucket-分组全部隐藏。 */
    private String receiverHideType;
    private LocalDateTime repliedAt;
    private String invalidReason;
    private LocalDateTime invalidTime;
    private Long matchId;
    private String matchNo;
    private Long conversationId;
    private String conversationNo;
    private Long requestMessageId;
    private Long replyMessageId;
    private LocalDateTime isolatedAt;
    private LocalDateTime purgeAfter;
    private LocalDateTime anonymizedAt;
}
