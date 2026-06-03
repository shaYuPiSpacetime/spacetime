package com.spacetime.admin.dto.response;

import lombok.Data;

/**
 * 管理后台 — 内容审核详情视图
 * 含用户基本信息 + 完整审核内容（图片原图/全文）+ 审核结果
 */
@Data
public class ModerationDetailVO {
    /** 审核记录ID */
    private Long id;
    /** 用户ID */
    private Long userId;
    /** 用户昵称 */
    private String nickname;
    /** 用户头像 */
    private String avatar;
    /** 内容类型：照片/文字 */
    private String contentType;
    /** 内容完整值（照片原图URL 或 文本全文） */
    private String contentFull;
    /** 文本字段类型（关于我 / 希望TA了解） */
    private String contentField;
    /** 提交时间 */
    private String submitTime;
    /** 当前审核状态 */
    private String status;
    /** 驳回原因 */
    private String rejectReason;
}
