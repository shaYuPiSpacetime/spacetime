package com.spacetime.admin.dto.response;

import lombok.Data;

/**
 * 管理后台 — 认证审核详情视图
 * 含用户基本信息 + 审核内容字段（标签-值对）+ 审核结果
 */
@Data
public class VerificationAuditDetailVO {
    /** 认证记录ID */
    private Long id;
    /** 用户ID */
    private Long userId;
    /** 用户昵称 */
    private String nickname;
    /** 用户头像 */
    private String avatar;
    /** 认证等级 */
    private Integer verifyLevel;
    /** 认证内容字段列表（标签-值对），泛化承载三类认证内容差异 */
    private java.util.List<FieldEntry> fields;
    /** 提交时间 */
    private String submitTime;
    /** 审核结果时间 */
    private String resultTime;
    /** 驳回原因 */
    private String rejectReason;
    /** 当前审核状态（PENDING/APPROVED/REJECTED，用于前端判断是否可操作） */
    private String status;
}
