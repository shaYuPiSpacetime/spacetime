package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/** 微信图片异步审核任务。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("community_media_audit_task")
public class CommunityMediaAuditTask extends BaseEntity {
    private Long postId;
    private String postNo;
    private String traceId;
    private String mediaUrl;
    private String status;
    private String providerLabel;
    private String callbackPayload;
    private LocalDateTime callbackTime;
    private Integer version;
}
