package com.spacetime.admin.dto.request;

import com.spacetime.common.dto.PageReq;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 管理后台 — 用户列表分页查询请求
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class AppUserPageReq extends PageReq {
    /** 关键词（模糊匹配昵称、学校） */
    private String keyword;
    /** 昵称精确筛选 */
    private String nickname;
    /** 学校模糊筛选 */
    private String school;
    /** 账号状态 @see AccountStatusEnum */
    private String accountStatus;
    /** 核心准入状态：OPEN/PENDING/BLOCKED */
    private String coreAccessStatus;
    /** 认证状态聚合筛选：AVATAR_APPROVED/REAL_NAME_APPROVED/EDUCATION_APPROVED */
    private String verificationStatus;
    /** 用户身份：职场人/在校生 */
    private String identity;
    /** 城市筛选：按现居城市匹配 */
    private String city;
    /** 关系反馈准入：OPEN/CLOSED/ABNORMAL */
    private String relationshipAccess;
    /** VIP 状态：active-有效，inactive-未开通，expired-已过期 */
    private String vipStatus;
    /** 性别 @see GenderEnum */
    private String gender;
    /** 实名认证状态筛选 @see VerificationStatusEnum */
    private String realNameStatus;
    /** 学历认证状态筛选 @see VerificationStatusEnum */
    private String educationStatus;
    /** 头像认证状态筛选 @see VerificationStatusEnum */
    private String avatarVerifyStatus;
    /** 是否完成首登 */
    private Integer firstLoginCompleted;
    /** 用户ID精确筛选 */
    private Long userId;
    /** 注册时间范围起（yyyy-MM-dd） */
    private String registerTimeStart;
    /** 注册时间范围止（yyyy-MM-dd） */
    private String registerTimeEnd;
}
