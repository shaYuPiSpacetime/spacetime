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
    /** 查询用户资产汇总 */
    AssetSummaryVO getSummary(Long userId);
    /** 批量解锁 */
    UnlockVO unlock(Long userId, UnlockReq req);
    /** 分页查询解锁记录 */
    Page<UnlockRecordVO> getRecords(Long userId, PageReq req);
}
