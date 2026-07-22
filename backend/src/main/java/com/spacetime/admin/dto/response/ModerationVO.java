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
    /** 图片类型：相册/资料背景图 */
    private String imageType;
    /** 图片分类：相册/背景图 */
    private String imageCategory;
    /** 图片预览 URL */
    private String imageUrl;
    /** 文本类型：关于我/资料问答 */
    private String textType;
    /** 文本场景标题：资料问答题目标题，如见面偏好、住房情况 */
    private String contentTitle;
    /** 资料问答题目 key，用于排查具体提交场景 */
    private String questionKey;
    /** 文本摘要，列表不展示完整原文 */
    private String textSummary;
    /** 内容预览（照片JSON或文字前50字） */
    private String contentPreview;
    /** 审核状态 */
    private String status;
    /** 审核来源：MACHINE/MANUAL */
    private String auditSource;
    /** 驳回原因 */
    private String rejectReason;
    /** 提交时间 */
    private String submitTime;
}
