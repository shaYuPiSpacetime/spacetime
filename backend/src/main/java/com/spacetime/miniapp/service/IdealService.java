package com.spacetime.miniapp.service;

import com.spacetime.miniapp.dto.request.IdealSearchReq;
import com.spacetime.miniapp.dto.response.IdealMetaVO;
import com.spacetime.miniapp.dto.response.IdealResultPageVO;
import com.spacetime.miniapp.dto.response.IdealSearchVO;

/** 理想型筛选、快照和隐私结果服务。 */
public interface IdealService {
    IdealMetaVO getMeta(Long userId);
    IdealSearchVO search(Long userId, IdealSearchReq req);
    IdealResultPageVO getResults(Long userId, String snapshotNo, String cursor);
}
