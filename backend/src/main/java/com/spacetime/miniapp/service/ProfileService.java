package com.spacetime.miniapp.service;

import com.spacetime.miniapp.dto.request.ProfileInitSaveReq;
import com.spacetime.miniapp.dto.request.ProfileUpdateReq;
import com.spacetime.miniapp.dto.response.AccessStatusVO;
import com.spacetime.miniapp.dto.response.ProfileDetailVO;
import com.spacetime.miniapp.dto.response.ProfileInitStatusVO;

/**
 * 用户资料服务
 */
public interface ProfileService {
    /**
     * 查询首登初始化状态
     * @param userId 用户ID
     * @return 是否已完成 + 当前步骤 + 下一步 + 已保存字段
     */
    ProfileInitStatusVO getInitStatus(Long userId);

    /**
     * 保存第1步或第2步资料
     * @param userId 用户ID
     * @param req 步骤号 + 当前步骤字段
     * @return 更新后的步骤状态
     */
    ProfileInitStatusVO saveInit(Long userId, ProfileInitSaveReq req);

    /**
     * 完成第3步并标记首登完成
     * @param userId 用户ID
     * @param req 最后一步字段
     * @return 完整资料详情
     */
    ProfileDetailVO completeInit(Long userId, ProfileInitSaveReq req);

    /**
     * 查看资料详情
     * @param userId 用户ID
     * @return 完整资料 + 准入状态
     */
    ProfileDetailVO getDetail(Long userId);

    /**
     * 增量更新资料（null 字段不更新）
     * @param userId 用户ID
     * @param req 需要更新的字段
     * @return 更新后的完整资料
     */
    ProfileDetailVO updateProfile(Long userId, ProfileUpdateReq req);

    /**
     * 查询准入状态
     * @param userId 用户ID
     * @return 三种能力的开关 + 阻断原因
     */
    AccessStatusVO getAccessStatus(Long userId);
}
