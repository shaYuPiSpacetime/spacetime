package com.spacetime.admin.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.PromotionInvitePageReq;
import com.spacetime.admin.dto.response.PromotionInviteRelationVO;

/**
 * 邀请关系后台服务接口
 */
public interface PromotionInviteAdminService {
    /** 分页查询邀请关系 */
    Page<PromotionInviteRelationVO> list(PromotionInvitePageReq req);
    /** 查询邀请关系详情 */
    PromotionInviteRelationVO detail(Long id);
}
