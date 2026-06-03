package com.spacetime.admin.dto.response;

import lombok.Data;

/**
 * 管理后台 — 内容审核列表行视图
 */
@Data
public class ModerationVO {
    /** 审核记录ID */
    private Long id;
    /** 用户ID */
    private Long userId;
    /** 用户头像URL */
    private String avatar;
    /** 用户昵称 */
    private String nickname;
    /** 内容类型: 照片/文字 */
    private String contentType;
    /** 内容预览（照片JSON或文字前50字） */
    private String contentPreview;
    /** 审核状态 */
    private String status;
    /** 驳回原因 */
    private String rejectReason;
    /** 提交时间 */
    private String submitTime;
}
