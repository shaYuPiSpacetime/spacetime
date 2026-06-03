package com.spacetime.miniapp.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dto.PageReq;
import com.spacetime.miniapp.dto.request.UnlockReq;
import com.spacetime.miniapp.dto.response.AssetSummaryVO;
import com.spacetime.miniapp.dto.response.UnlockRecordVO;
import com.spacetime.miniapp.dto.response.UnlockVO;

/**
 * 小程序用户资产服务接口
 */
public interface AssetService {

    /**
     * 查询用户资产汇总
     *
     * @param userId 用户ID
     * @return 资产汇总信息（VIP状态、成家币余额、今日免费用量等）
     */
    AssetSummaryVO getSummary(Long userId);

    /**
     * 批量解锁（消耗成家币解锁指定目标用户）
     *
     * @param userId 当前用户ID
     * @param req    解锁请求（场景 + 目标用户ID列表）
     * @return 解锁结果（解锁人数、消耗成家币数）
     */
    UnlockVO unlock(Long userId, UnlockReq req);

    /**
     * 分页查询用户解锁记录
     *
     * @param userId 用户ID
     * @param req    分页请求参数
     * @return 解锁记录分页列表
     */
    Page<UnlockRecordVO> getRecords(Long userId, PageReq req);
}
