package com.spacetime.admin.dto.response;

import lombok.Data;

/**
 * 管理后台 — 用户列表行视图
 */
@Data
public class AppUserListVO {
    /** 用户ID */
    private Long id;
    /** 头像URL */
    private String avatar;
    /** 昵称 */
    private String nickname;
    /** 性别 */
    private String gender;
    /** 年龄 */
    private Integer age;
    /** 学校 */
    private String school;
    /** 实名认证状态 */
    private String realNameStatus;
    /** 学历认证状态 */
    private String educationStatus;
    /** 头像认证状态 */
    private String avatarVerifyStatus;
    /** 是否完成首登 */
    private Integer firstLoginCompleted;
    /** 资料完整度分 */
    private Integer profileScore;
    /** 账号状态 */
    private String accountStatus;
    /** 注册时间 */
    private String registerTime;
    /** 最近登录时间 */
    private String lastLoginTime;
}
