package com.spacetime.admin.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.*;
import com.spacetime.admin.dto.response.UserDetailVO;
import com.spacetime.admin.dto.response.UserVO;

/**
 * 用户管理服务接口
 */
public interface UserService {
    /** 分页查询用户列表 */
    Page<UserVO> list(UserPageReq req);
    /** 查询用户详情 */
    UserDetailVO detail(Long id);
    /** 创建用户，返回新用户 ID */
    Long create(UserCreateReq req);
    /** 更新用户信息 */
    void update(UserUpdateReq req);
    /** 删除用户 */
    void delete(Long id);
    /** 重置用户密码 */
    void resetPassword(ResetPwdReq req);
    /** 为用户分配角色 */
    void assignRoles(UserRoleReq req);
}
