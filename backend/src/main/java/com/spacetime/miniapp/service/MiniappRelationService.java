package com.spacetime.miniapp.service;

import com.spacetime.miniapp.dto.request.MatchPopupReadReq;
import com.spacetime.miniapp.dto.request.LikesMeReadReq;
import com.spacetime.miniapp.dto.request.RelationLikeCreateReq;
import com.spacetime.miniapp.dto.request.RelationVisitCreateReq;
import com.spacetime.miniapp.dto.response.LikesMePageVO;
import com.spacetime.miniapp.dto.response.LikesMeSummaryVO;
import com.spacetime.miniapp.dto.response.MatchPopupVO;
import com.spacetime.miniapp.dto.response.MutualMatchPageVO;
import com.spacetime.miniapp.dto.response.RecentViewersPageVO;
import com.spacetime.miniapp.dto.response.RelationLikeActionVO;
import com.spacetime.miniapp.dto.response.RelationVisitActionVO;

/** PRD-02 移动端关系反馈服务。 */
public interface MiniappRelationService {
    LikesMePageVO likesMe(Long userId, int page, int size, String snapshotCursor);
    LikesMeSummaryVO likesMeSummary(Long userId);
    void confirmLikesMeRead(Long userId, LikesMeReadReq req);
    RecentViewersPageVO recentViewers(Long userId, int page, int size);
    MutualMatchPageVO mutualMatches(Long userId, int page, int size);
    RelationLikeActionVO createLike(Long userId, RelationLikeCreateReq req);
    RelationLikeActionVO cancelLike(Long userId, Long targetUserId);
    RelationVisitActionVO recordVisit(Long userId, RelationVisitCreateReq req);
    MatchPopupVO pendingPopup(Long userId);
    void readPopup(Long userId, String matchNo, MatchPopupReadReq req);
}
