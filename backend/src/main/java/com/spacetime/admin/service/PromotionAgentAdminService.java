package com.spacetime.admin.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.PromotionAgentPageReq;
import com.spacetime.admin.dto.request.PromotionAgentSaveReq;
import com.spacetime.admin.dto.response.PromotionAgentCodeVO;
import com.spacetime.admin.dto.response.PromotionAgentVO;
import com.spacetime.common.entity.PromotionAgentEvent;

/**
 * 代理后台服务接口
 */
public interface PromotionAgentAdminService {
    /** 分页查询代理 */
    Page<PromotionAgentVO> list(PromotionAgentPageReq req);
    /** 查询代理详情 */
    PromotionAgentVO detail(Long id);
    /** 创建代理 */
    Long create(PromotionAgentSaveReq req);
    /** 更新代理 */
    void update(Long id, PromotionAgentSaveReq req);
    /** 更新代理状态 */
    void updateStatus(Long id, String status);
    /** 生成代理码 */
    PromotionAgentCodeVO regenerateCode(Long agentId);
    /** 停用代理码 */
    void disableCode(Long codeId);
    /** 查询代理事件 */
    Page<PromotionAgentEvent> events(Long agentId, int page, int size, String eventType);
}
