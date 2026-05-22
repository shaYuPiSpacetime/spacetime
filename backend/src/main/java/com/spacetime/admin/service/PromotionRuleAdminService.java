package com.spacetime.admin.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.PromotionRulePageReq;
import com.spacetime.admin.dto.request.PromotionRuleSaveReq;
import com.spacetime.admin.dto.request.PromotionRuleTierReq;
import com.spacetime.admin.dto.response.PromotionRuleVO;

import java.util.List;

/**
 * 推广规则后台服务接口
 */
public interface PromotionRuleAdminService {
    /** 分页查询规则 */
    Page<PromotionRuleVO> list(PromotionRulePageReq req);
    /** 查询规则详情 */
    PromotionRuleVO detail(Long id);
    /** 创建规则 */
    Long create(PromotionRuleSaveReq req);
    /** 更新规则 */
    void update(Long id, PromotionRuleSaveReq req);
    /** 更新规则状态 */
    void updateStatus(Long id, String status);
    /** 保存阶梯规则 */
    void saveTiers(Long ruleId, List<PromotionRuleTierReq> tiers);
}
