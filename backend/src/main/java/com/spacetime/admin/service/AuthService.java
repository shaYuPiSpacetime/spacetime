package com.spacetime.admin.service;

import com.spacetime.admin.dto.request.LoginReq;
import com.spacetime.admin.dto.response.LoginVO;

import java.util.List;

/**
 * 认证服务接口
 */
public interface AuthService {
    /** 登录 */
    LoginVO login(LoginReq req);
    /** 查询当前用户的最新权限 */
    List<String> getCurrentPermissions(Long userId);
    /** 退出登录 */
    void logout(String token);
}
