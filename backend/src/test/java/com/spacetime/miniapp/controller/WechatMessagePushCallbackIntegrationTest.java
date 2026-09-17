package com.spacetime.miniapp.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.community.CommunityAuditPolicy;
import com.spacetime.common.config.CommunityContentSecurityProperties;
import com.spacetime.common.dao.AppUserAuditRecordDao;
import com.spacetime.common.dao.CommunityExtensionDao;
import com.spacetime.common.dao.CommunityPostDao;
import com.spacetime.common.dao.ExternalProviderTaskDao;
import com.spacetime.common.entity.AppUserAuditRecord;
import com.spacetime.common.entity.ExternalProviderTask;
import com.spacetime.common.service.AppUserAuditService;
import com.spacetime.miniapp.service.impl.CommunityMediaAuditCallbackServiceImpl;
import com.spacetime.miniapp.service.impl.WechatMessagePushRouterServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.HexFormat;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class WechatMessagePushCallbackIntegrationTest {
    private static final String CALLBACK_TOKEN = "test-only-callback-token";

    @Mock private CommunityExtensionDao extensionDao;
    @Mock private CommunityPostDao postDao;
    @Mock private ExternalProviderTaskDao externalProviderTaskDao;
    @Mock private AppUserAuditRecordDao appUserAuditRecordDao;
    @Mock private AppUserAuditService appUserAuditService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        CommunityContentSecurityProperties properties = new CommunityContentSecurityProperties();
        properties.setCallbackToken(CALLBACK_TOKEN);
        ObjectMapper objectMapper = new ObjectMapper();
        var mediaAuditService = new CommunityMediaAuditCallbackServiceImpl(properties, extensionDao, postDao,
                externalProviderTaskDao, appUserAuditRecordDao, appUserAuditService,
                new CommunityAuditPolicy(), objectMapper);
        var router = new WechatMessagePushRouterServiceImpl(mediaAuditService, objectMapper);
        mockMvc = MockMvcBuilders.standaloneSetup(
                new CommunityMediaAuditCallbackController(mediaAuditService, router)).build();
    }

    @Test
    void signedCustomerMessage_shouldReturnWechatJsonTransferWithoutMediaAudit() throws Exception {
        mockMvc.perform(post("/miniapp/content-security/wechat/callback")
                        .param("signature", signature("123", "nonce"))
                        .param("timestamp", "123")
                        .param("nonce", "nonce")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ToUserName\":\"miniapp-id\",\"FromUserName\":\"user-openid\","
                                + "\"CreateTime\":123,\"MsgType\":\"text\",\"Content\":\"hello\"}"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.ToUserName").value("user-openid"))
                .andExpect(jsonPath("$.FromUserName").value("miniapp-id"))
                .andExpect(jsonPath("$.MsgType").value("transfer_customer_service"))
                .andExpect(jsonPath("$.CreateTime").isNumber());
        verifyNoInteractions(extensionDao, postDao, externalProviderTaskDao, appUserAuditRecordDao);
    }

    @Test
    void invalidSignature_shouldReturnHttp403InsteadOfBusinessJson() throws Exception {
        mockMvc.perform(post("/miniapp/content-security/wechat/callback")
                        .param("signature", "wrong")
                        .param("timestamp", "123")
                        .param("nonce", "nonce")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"MsgType\":\"text\"}"))
                .andExpect(status().isForbidden())
                .andExpect(content().string("fail"));
        verifyNoInteractions(extensionDao, postDao);
    }

    @Test
    void oversizedSignedPayload_shouldReturnHttp400WithoutRunningMediaAudit() throws Exception {
        mockMvc.perform(post("/miniapp/content-security/wechat/callback")
                        .param("signature", signature("123", "nonce"))
                        .param("timestamp", "123")
                        .param("nonce", "nonce")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"Content\":\"" + "x".repeat(1024 * 1024) + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("fail"));
        verifyNoInteractions(extensionDao, postDao, externalProviderTaskDao, appUserAuditRecordDao);
    }

    @Test
    void jsonSentAsTextPlain_shouldStillReachCustomerService() throws Exception {
        mockMvc.perform(post("/miniapp/content-security/wechat/callback")
                        .param("signature", signature("123", "nonce"))
                        .param("timestamp", "123")
                        .param("nonce", "nonce")
                        .contentType(MediaType.TEXT_PLAIN)
                        .content("{\"ToUserName\":\"miniapp-id\",\"FromUserName\":\"user-openid\","
                                + "\"MsgType\":\"text\",\"Content\":\"hello\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.MsgType").value("transfer_customer_service"));
    }

    @Test
    void signedMediaAudit_shouldStillApproveViaExistingService() throws Exception {
        ExternalProviderTask providerTask = new ExternalProviderTask();
        providerTask.setId(31L);
        providerTask.setProviderType("IMAGE_SAFETY");
        providerTask.setTaskStatus("PENDING");
        AppUserAuditRecord record = new AppUserAuditRecord();
        record.setId(41L);
        record.setStatus("PENDING");
        when(externalProviderTaskDao.selectOne(any())).thenReturn(providerTask);
        when(appUserAuditRecordDao.selectOne(any())).thenReturn(record);

        mockMvc.perform(post("/miniapp/content-security/wechat/callback")
                        .param("signature", signature("123", "nonce"))
                        .param("timestamp", "123")
                        .param("nonce", "nonce")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"Event\":\"wxa_media_check\",\"trace_id\":\"trace-1\","
                                + "\"result\":{\"suggest\":\"pass\"}}"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_PLAIN))
                .andExpect(content().string("success"));
        verify(appUserAuditService).machineApprove(eq(41L), eq(31L), contains("trace-1"));
    }

    @Test
    void unknownMediaTrace_shouldNotBeAcknowledgedAsSuccess() throws Exception {
        mockMvc.perform(post("/miniapp/content-security/wechat/callback")
                        .param("signature", signature("123", "nonce"))
                        .param("timestamp", "123")
                        .param("nonce", "nonce")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"Event\":\"wxa_media_check\",\"trace_id\":\"unknown\","
                                + "\"result\":{\"suggest\":\"pass\"}}"))
                .andExpect(status().isInternalServerError())
                .andExpect(content().string("fail"));
    }

    private String signature(String timestamp, String nonce) throws Exception {
        String[] parts = {CALLBACK_TOKEN, timestamp, nonce};
        Arrays.sort(parts);
        byte[] digest = MessageDigest.getInstance("SHA-1")
                .digest(String.join("", parts).getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(digest);
    }
}
