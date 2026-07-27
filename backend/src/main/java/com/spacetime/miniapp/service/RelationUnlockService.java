package com.spacetime.miniapp.service;

import com.spacetime.miniapp.dto.request.RelationUnlockConfirmReq;
import com.spacetime.miniapp.dto.request.RelationUnlockQuoteReq;
import com.spacetime.miniapp.dto.response.UnlockConfirmVO;
import com.spacetime.miniapp.dto.response.UnlockQuoteVO;

/** 喜欢/访客具体关系记录的两步单条解锁服务。 */
public interface RelationUnlockService {
    UnlockQuoteVO quote(Long userId, RelationUnlockQuoteReq req);
    UnlockConfirmVO confirm(Long userId, RelationUnlockConfirmReq req);
}
