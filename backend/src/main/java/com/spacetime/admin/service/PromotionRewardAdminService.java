package com.spacetime.admin.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.PromotionRewardPageReq;
import com.spacetime.admin.dto.response.PromotionRewardLogVO;

/**
 * 邀请奖励后台服务接口
 */
public interface PromotionRewardAdminService {
    /** 分页查询奖励流水 */
    Page<PromotionRewardLogVO> list(PromotionRewardPageReq req);
    /** 查询冻结奖励 */
    Page<PromotionRewardLogVO> frozen(int page, int size);
    /** 确认有效并发放 */
    void approve(Long id, String remark);
    /** 确认无效并作废 */
    void reject(Long id, String remark);
}
