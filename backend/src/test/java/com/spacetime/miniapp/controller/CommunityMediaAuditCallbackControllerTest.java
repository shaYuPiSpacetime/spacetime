package com.spacetime.miniapp.controller;

import com.spacetime.miniapp.service.CommunityMediaAuditCallbackService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class CommunityMediaAuditCallbackControllerTest {
    @Mock
    private CommunityMediaAuditCallbackService callbackService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(
                new CommunityMediaAuditCallbackController(callbackService)).build();
    }

    @Test
    void verifyUrl_shouldEchoWechatChallenge() throws Exception {
        when(callbackService.verifyUrl("sig", "123", "nonce", "wechat-echo"))
                .thenReturn("wechat-echo");

        mockMvc.perform(get("/miniapp/content-security/wechat/callback")
                        .param("signature", "sig")
                        .param("timestamp", "123")
                        .param("nonce", "nonce")
                        .param("echostr", "wechat-echo"))
                .andExpect(status().isOk())
                .andExpect(content().string("wechat-echo"));
    }
}
