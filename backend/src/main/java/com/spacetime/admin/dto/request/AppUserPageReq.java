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
}
