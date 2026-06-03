package com.spacetime.admin.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.AppUserPageReq;
import com.spacetime.admin.dto.response.AppUserDetailVO;
import com.spacetime.admin.dto.response.AppUserListVO;

/**
 * 管理后台 — 小程序用户管理服务
 */
public interface AppUserAdminService {
    /**
     * 用户分页查询
     * @param req 筛选条件（关键词/昵称/学校/性别/状态/认证状态）
     * @return 分页结果
     */
    Page<AppUserListVO> getUserPage(AppUserPageReq req);

    /**
     * 用户详情查询（含认证信息）
     * @param id 用户ID
     * @return 用户完整资料 + 认证详情
     */
    AppUserDetailVO getUserDetail(Long id);

    /**
     * 变更用户账号状态
     * @param id 用户ID
     * @param status 目标状态 @see AccountStatusEnum
     */
    void updateUserStatus(Long id, String status);
}
