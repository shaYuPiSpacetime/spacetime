package com.spacetime.admin.dto.request;

import com.spacetime.common.dto.PageReq;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 管理后台 — 认证审核分页查询请求
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class VerificationPageReq extends PageReq {
    /** 用户ID精确筛选 */
    private Long userId;
    /** 认证状态筛选 @see VerificationStatusEnum */
    private String status;
    /** 审核来源：MACHINE/MANUAL */
    private String auditSource;
    /** 关键词模糊筛选 */
    private String keyword;
    /** 提交时间快捷筛选：TODAY/LAST_7_DAYS */
    private String submitTime;
    /** 头像人像识别筛选：ALL/PORTRAIT/FAILED */
    private String faceRecognition;
    /** 核心准入状态筛选：OPEN/PENDING/BLOCKED */
    private String coreAccessStatus;
    /** 学历认证方式筛选：CHSI/STUDENT_CARD */
    private String educationMethod;
    /** 资料图片类型筛选：ALBUM/BACKGROUND */
    private String imageType;
    /** 开放文本类型筛选：ABOUT_ME/PROFILE_QA */
    private String textType;
}
