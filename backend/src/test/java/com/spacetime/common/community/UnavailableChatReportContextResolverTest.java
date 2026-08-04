package com.spacetime.common.community;

import com.spacetime.common.exception.BusinessException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("PRD-05 聊天举报失败关闭")
class UnavailableChatReportContextResolverTest {

    @Test
    void resolverUnavailable_shouldRejectClientProvidedContext() {
        ChatReportContextResolver resolver = new UnavailableChatReportContextResolver();

        assertThatThrownBy(() -> resolver.resolve(1L,
                        new ChatReportLookup("private_chat", "CONV-1", null, "MSG-1")))
                .isInstanceOf(BusinessException.class)
                .hasMessage("chat_report_unavailable");
    }
}
