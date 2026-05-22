package com.spacetime.admin.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.PromotionSettlementCreateReq;
import com.spacetime.admin.dto.request.PromotionSettlementPageReq;
import com.spacetime.admin.dto.response.PromotionSettlementVO;

/**
 * 代理结算后台服务接口
 */
public interface PromotionSettlementAdminService {
    /** 分页查询结算单 */
    Page<PromotionSettlementVO> list(PromotionSettlementPageReq req);
    /** 创建结算单 */
    Long create(PromotionSettlementCreateReq req);
    /** 标记已确认 */
    void confirm(Long id, String remark);
    /** 标记已发放 */
    void paid(Long id, java.math.BigDecimal paidAmount, String remark);
}
