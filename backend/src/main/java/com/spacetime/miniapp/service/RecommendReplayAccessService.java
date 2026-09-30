package com.spacetime.miniapp.service;

import com.spacetime.miniapp.dto.request.RecommendReplayUnlockReq;
import com.spacetime.miniapp.dto.response.RecommendReplayQuoteVO;
import com.spacetime.miniapp.dto.response.RecommendReplayUnlockVO;

/** 三天回放单人主页访问与解锁。 */
public interface RecommendReplayAccessService {
    /** 今天确由服务端下发过该候选；客户端浏览动作不能替代发放凭据。 */
    boolean isTodayIssuedCandidate(Long userId, Long targetUserId);

    /** 仅判断推荐用户主页是否已有会员或付费访问权益，不组装回看列表。 */
    boolean canOpenRecommendedProfile(Long userId, Long targetUserId);

    RecommendReplayQuoteVO quote(Long userId, Long targetUserId);
    RecommendReplayUnlockVO unlock(Long userId, Long targetUserId, RecommendReplayUnlockReq req);
}
