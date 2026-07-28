package com.spacetime.miniapp.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.miniapp.dto.response.*;

/**
 * 小程序普通邀请只读应用服务。
 */
public interface PromotionInviteQueryService {
    InviteSourceTraceVO createSourceTrace(String sourceType, String sourceToken, String visitorKey);
    InviteHomeVO home(Long userId);
    Page<InviteRecordVO> records(Long userId, int page, int size, String status);
    InviteRulesVO rules();
    InviteRulesH5VO rulesH5();
}
