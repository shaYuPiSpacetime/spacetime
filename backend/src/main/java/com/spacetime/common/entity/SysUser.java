package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * 系统用户实体
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("sys_user")
public class SysUser extends BaseEntity {
    /** 用户名 */
    private String username;
    /** 密码（BCrypt 加密） */
    private String password;
    /** 昵称 */
    private String nickname;
    /** 邮箱 */
    private String email;
    /** 手机号 */
    private String phone;
    /** 状态 @see CommonStatusEnum */
    private String status;
    /** 头像 URL */
    private String avatar;
    /** 最后登录时间 */
    private LocalDateTime lastLoginTime;
}
