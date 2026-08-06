package com.spacetime.miniapp.service;

import com.spacetime.miniapp.dto.response.IdealHelpVO;
import com.spacetime.miniapp.dto.response.IdealSearchRecordPageVO;
import com.spacetime.miniapp.dto.response.IdealUnlockRecordPageVO;

/** 理想型筛选历史、解锁历史和帮助中心服务。 */
public interface IdealHistoryService {
    IdealSearchRecordPageVO searchRecords(Long userId, String cursor);
    IdealUnlockRecordPageVO unlockRecords(Long userId, String status, String cursor);
    IdealHelpVO help(Long userId);
}
