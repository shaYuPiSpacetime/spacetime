package com.spacetime.miniapp.controller;

import com.spacetime.miniapp.service.CommunityMediaAuditCallbackService;
import com.spacetime.miniapp.service.WechatMessagePushRouterService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class CommunityMediaAuditCallbackControllerTest {
    @Mock
    private CommunityMediaAuditCallbackService callbackService;
    @Mock
    private WechatMessagePushRouterService messagePushRouterService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(
                new CommunityMediaAuditCallbackController(callbackService, messagePushRouterService)).build();
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

    @Test
    void customerText_shouldBeTransferredToWechatCustomerService() throws Exception {
        when(messagePushRouterService.route(org.mockito.ArgumentMatchers.eq("sig"),
                org.mockito.ArgumentMatchers.eq("123"), org.mockito.ArgumentMatchers.eq("nonce"),
                org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString()))
                .thenReturn("{\"ToUserName\":\"user-openid\",\"FromUserName\":\"miniapp-id\","
                        + "\"CreateTime\":123,\"MsgType\":\"transfer_customer_service\"}");
        mockMvc.perform(post("/miniapp/content-security/wechat/callback")
                        .param("signature", "sig")
                        .param("timestamp", "123")
                        .param("nonce", "nonce")
                        .contentType("application/json")
                        .content("{\"ToUserName\":\"miniapp-id\",\"FromUserName\":\"user-openid\","
                                + "\"CreateTime\":123,\"MsgType\":\"text\",\"Content\":\"hello\"}"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("\"MsgType\":\"transfer_customer_service\"")));
    }

    @Test
    void oversizedPayload_shouldBeRejectedBeforeRouterReceivesBody() throws Exception {
        mockMvc.perform(post("/miniapp/content-security/wechat/callback")
                        .param("signature", "sig")
                        .param("timestamp", "123")
                        .param("nonce", "nonce")
                        .contentType("application/json")
                        .content("x".repeat(1024 * 1024 + 1)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("fail"));
        verifyNoInteractions(messagePushRouterService);
    }
}
