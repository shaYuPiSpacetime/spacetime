package com.spacetime.common.website;

import com.baomidou.mybatisplus.annotation.TableName;
import com.spacetime.common.entity.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** 官网活动业务持久化对象；与小程序用户和订单完全隔离。 */
public final class WebsiteData {
    private WebsiteData() {}

    @Data @EqualsAndHashCode(callSuper = true) @TableName("website_user")
    public static class User extends BaseEntity {
        private String phone;
        private String nickname;
        private String status;
    }

    @Data @EqualsAndHashCode(callSuper = true) @TableName("website_activity")
    public static class Activity extends BaseEntity {
        private Long authorId;
        private String title;
        private String content;
        private LocalDateTime startTime;
        private String location;
        private BigDecimal estimatedCost;
        private String status;
        private String auditNote;
    }

    @Data @EqualsAndHashCode(callSuper = true) @TableName("website_registration")
    public static class Registration extends BaseEntity {
        private Long activityId;
        private Long userId;
        private String status;
    }

    @Data @EqualsAndHashCode(callSuper = true) @TableName("website_conversation")
    public static class Conversation extends BaseEntity {
        private Long activityId;
        private Long userLowId;
        private Long userHighId;
    }

    @Data @EqualsAndHashCode(callSuper = true) @TableName("website_message")
    public static class Message extends BaseEntity {
        private Long conversationId;
        private Long senderId;
        private String messageType;
        private String contentText;
        private Long mediaId;
        private String status;
    }

    @Data @EqualsAndHashCode(callSuper = true) @TableName("website_media")
    public static class Media extends BaseEntity {
        private Long ownerId;
        private String objectKey;
        private String status;
        private String targetType;
        private Long targetId;
    }

    @Data @EqualsAndHashCode(callSuper = true) @TableName("website_report")
    public static class Report extends BaseEntity {
        private Long reporterId;
        private String targetType;
        private Long targetId;
        private String reason;
        private String contact;
        private String status;
        private String resolution;
    }

    @Data @EqualsAndHashCode(callSuper = true) @TableName("website_audit_log")
    public static class AuditLog extends BaseEntity {
        private String actorType;
        private Long actorId;
        private String action;
        private String targetType;
        private Long targetId;
        private String requestIp;
        private String userAgent;
        private String remark;
        private LocalDateTime retainUntil;
    }

    @Data @EqualsAndHashCode(callSuper = true) @TableName("website_legal_document")
    public static class LegalDocument extends BaseEntity {
        private String documentType;
        private String version;
        private String title;
        private String content;
        private String status;
    }
}
