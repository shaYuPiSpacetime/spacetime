package com.spacetime.miniapp.service;

import com.spacetime.miniapp.dto.request.IdealUnlockAllQuoteReq;
import com.spacetime.miniapp.dto.request.IdealUnlockConfirmReq;
import com.spacetime.miniapp.dto.request.IdealUnlockQuoteReq;
import com.spacetime.miniapp.dto.response.IdealUnlockConfirmVO;
import com.spacetime.miniapp.dto.response.IdealUnlockQuoteVO;
import com.spacetime.miniapp.dto.response.IdealPricingVO;

/** 理想型两步报价、扣币与资料解锁服务。 */
public interface IdealUnlockService {
    IdealUnlockQuoteVO quote(Long userId, IdealUnlockQuoteReq req);
    IdealUnlockQuoteVO quoteAll(Long userId, IdealUnlockAllQuoteReq req);
    IdealUnlockConfirmVO confirm(Long userId, IdealUnlockConfirmReq req);
    IdealPricingVO getPricing();
}
