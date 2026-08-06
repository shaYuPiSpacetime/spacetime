package com.spacetime.miniapp.service;

import com.spacetime.miniapp.dto.request.RecommendPreferenceSaveReq;
import com.spacetime.miniapp.dto.request.RecommendViewActionReq;
import com.spacetime.miniapp.dto.response.RecommendCandidatePageVO;
import com.spacetime.miniapp.dto.response.RecommendPreferenceVO;
import com.spacetime.miniapp.dto.response.RecommendReplayPageVO;

/** 推荐业务服务。 */
public interface RecommendService {
    RecommendPreferenceVO getPreferences(Long userId);
    RecommendPreferenceVO savePreferences(Long userId, RecommendPreferenceSaveReq req);
    RecommendCandidatePageVO getCandidates(Long userId, String cursor);
    void recordAction(Long userId, String candidateNo, String action, RecommendViewActionReq req);
    RecommendReplayPageVO getReplay(Long userId);
}
