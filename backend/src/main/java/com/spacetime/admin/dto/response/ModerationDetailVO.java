package com.spacetime.admin.dto.response;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
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
    /** 图片类型：相册/背景图；文字审核为空。 */
    private String imageType;
    /** 内容完整值（照片原图URL 或 文本全文） */
    private String contentFull;
    /** 文本字段类型（关于我 / 资料问答） */
    private String contentField;
    /** 文本场景标题：资料问答题目标题，如见面偏好、住房情况 */
    private String contentTitle;
    /** 资料问答题目 key */
    private String questionKey;
    /** 提交时间 */
    private String submitTime;
    /** 当前审核状态 */
    private String status;
    /** 审核来源：MACHINE/MANUAL */
    private String auditSource;
    /** 驳回原因 */
    private String rejectReason;
    /** 审核历史分页 */
    private Page<AuditHistoryVO> historyPage;
}
