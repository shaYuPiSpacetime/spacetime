package com.spacetime.miniapp.service;

import com.spacetime.miniapp.dto.request.RecommendReplayUnlockReq;
import com.spacetime.miniapp.dto.response.RecommendReplayQuoteVO;
import com.spacetime.miniapp.dto.response.RecommendReplayUnlockVO;

/** 三天回放单人主页访问与解锁。 */
public interface RecommendReplayAccessService {
    RecommendReplayQuoteVO quote(Long userId, Long targetUserId);
    RecommendReplayUnlockVO unlock(Long userId, Long targetUserId, RecommendReplayUnlockReq req);
}
