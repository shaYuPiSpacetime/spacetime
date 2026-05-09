package com.spacetime.admin.service;

import com.spacetime.admin.dto.request.LoginReq;
import com.spacetime.admin.dto.response.LoginVO;

/**
 * 认证服务接口
 */
public interface AuthService {
    /** 登录 */
    LoginVO login(LoginReq req);
    /** 退出登录 */
    void logout(String token);
}
