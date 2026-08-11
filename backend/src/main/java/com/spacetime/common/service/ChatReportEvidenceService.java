package com.spacetime.common.service;

import com.spacetime.common.community.ChatEvidenceSnapshot;
import com.spacetime.common.community.TrustedChatReportContext;
import com.spacetime.common.entity.CommunityReport;

import java.time.LocalDateTime;

/** 把消息主表最小窗口固化为案件独立密文证据。 */
public interface ChatReportEvidenceService {
    ChatEvidenceSnapshot freeze(CommunityReport report, TrustedChatReportContext context,
                                LocalDateTime now);
}
