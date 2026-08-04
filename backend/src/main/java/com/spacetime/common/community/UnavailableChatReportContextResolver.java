package com.spacetime.common.community;

import com.spacetime.common.exception.BusinessException;

/**
 * 聊天解析器未接入时失败关闭，禁止降级信任客户端正文或用户 ID。
 */
public class UnavailableChatReportContextResolver implements ChatReportContextResolver {
    @Override
    public TrustedChatReportContext resolve(Long reporterId, ChatReportLookup lookup) {
        throw new BusinessException(505016, "chat_report_unavailable");
    }
}
