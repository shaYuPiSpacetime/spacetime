package com.spacetime.common.provider.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.config.TencentImProperties;
import com.spacetime.common.dao.AppUserImAccountDao;
import com.spacetime.common.entity.AppUserImAccount;
import com.spacetime.common.provider.ImAccountCredential;
import com.spacetime.common.provider.InstantMessageCommand;
import com.spacetime.common.provider.InstantMessageSendResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;

import java.net.URI;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TencentInstantMessageProviderTest {

    @Mock private AppUserImAccountDao accountDao;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final CapturingTransport transport = new CapturingTransport();
    private TencentInstantMessageProvider provider;

    @BeforeEach
    void setUp() {
        TencentImProperties properties = new TencentImProperties();
        properties.setEnabled(true);
        properties.setSdkAppId(1400000001L);
        properties.setSecretKey("unit-test-secret");
        properties.setAdministrator("administrator");
        properties.setRestBaseUrl("https://console.tim.qq.com");
        properties.setUserSigExpireSeconds(86400L);
        properties.setProtocolVersion(1);
        provider = new TencentInstantMessageProvider(properties, objectMapper, accountDao,
                transport, new TencentUserSigSigner(objectMapper),
                Clock.fixed(Instant.parse("2026-08-10T09:00:00Z"), ZoneId.of("UTC")));
    }

    @Test
    void shouldSendWhisperWithSingleTimMappingAndMetadataOnlyCloudData() throws Exception {
        when(accountDao.selectByUserId(11L)).thenReturn(synced(11L, "tu_sender"));
        when(accountDao.selectByUserId(22L)).thenReturn(synced(22L, "tu_receiver"));
        transport.responseBody = """
                {"ActionStatus":"OK","ErrorCode":0,"ErrorInfo":"",\
                 "MsgTime":1786352400,"MsgKey":"89541_2574206_1786352400",\
                 "MsgId":"144115233406643804-1727580296-4026038328"}
                """;

        InstantMessageSendResult result = provider.send(new InstantMessageCommand(
                99L, "MSG202608100001", 11L, 22L, "whisper_request", "认真认识一下",
                "{\"whisperNo\":\"WSP202608100001\",\"sendMsgControl\":[\"NoUnread\",\"NoLastMsg\",\"NoMsgCheck\"]}",
                1));

        assertThat(result.timMessageId()).isEqualTo("144115233406643804-1727580296-4026038328");
        assertThat(result.timMsgKey()).isEqualTo("89541_2574206_1786352400");
        assertThat(result.sentAt()).isEqualTo(LocalDateTime.of(2026, 8, 10, 17, 0));
        assertThat(transport.uri.getPath()).isEqualTo("/v4/openim/sendmsg");
        JsonNode request = objectMapper.readTree(transport.requestBody);
        assertThat(request.path("From_Account").asText()).isEqualTo("tu_sender");
        assertThat(request.path("To_Account").asText()).isEqualTo("tu_receiver");
        assertThat(request.path("MsgSeq").asLong()).isPositive();
        assertThat(request.path("MsgRandom").asLong()).isPositive();
        assertThat(request.path("SendMsgControl").toString())
                .isEqualTo("[\"NoUnread\",\"NoLastMsg\",\"NoMsgCheck\"]");
        assertThat(request.path("MsgBody").get(0).path("MsgType").asText())
                .isEqualTo("TIMCustomElem");
        assertThat(request.path("MsgBody").get(0).path("MsgContent").path("Data").asText())
                .contains("认真认识一下").contains("WSP202608100001");
        assertThat(request.path("CloudCustomData").asText())
                .contains("WSP202608100001").doesNotContain("认真认识一下");
    }

    @Test
    void shouldImportPendingAccountBeforeIssuingCredential() {
        AppUserImAccount pending = pending(11L, "tu_random_01");
        when(accountDao.selectByUserId(11L)).thenReturn(pending);
        transport.responseBody = "{\"ActionStatus\":\"OK\",\"ErrorCode\":0,\"ErrorInfo\":\"\"}";

        ImAccountCredential credential = provider.issueCredential(11L, "测试用户", null);

        assertThat(credential.sdkAppId()).isEqualTo(1400000001L);
        assertThat(credential.imUserId()).isEqualTo("tu_random_01");
        assertThat(credential.userSig()).isNotBlank();
        assertThat(credential.expireAt()).isEqualTo(Instant.parse("2026-08-11T09:00:00Z"));
        assertThat(transport.uri.getPath()).isEqualTo("/v4/im_open_login_svc/account_import");
        verify(accountDao).updateById(any(AppUserImAccount.class));
    }

    @Test
    void shouldCreateAndImportMissingAccountOnDemand() throws Exception {
        when(accountDao.selectByUserId(22L)).thenReturn(null);
        transport.responseBody = "{\"ActionStatus\":\"OK\",\"ErrorCode\":0,\"ErrorInfo\":\"\"}";

        provider.syncAccount(22L, "历史会话用户", "https://example.com/avatar.png");

        ArgumentCaptor<AppUserImAccount> accountCaptor =
                ArgumentCaptor.forClass(AppUserImAccount.class);
        verify(accountDao).insert(accountCaptor.capture());
        AppUserImAccount created = accountCaptor.getValue();
        assertThat(created.getUserId()).isEqualTo(22L);
        assertThat(created.getImUserId()).startsWith("tu_").hasSize(27);
        assertThat(created.getSyncStatus()).isEqualTo("synced");
        assertThat(transport.uri.getPath()).isEqualTo("/v4/im_open_login_svc/account_import");
        JsonNode request = objectMapper.readTree(transport.requestBody);
        assertThat(request.path("UserID").asText()).isEqualTo(created.getImUserId());
        assertThat(request.path("Nick").asText()).isEqualTo("历史会话用户");
        assertThat(request.path("FaceUrl").asText())
                .isEqualTo("https://example.com/avatar.png");
        verify(accountDao).updateById(created);
    }

    private AppUserImAccount synced(Long userId, String imUserId) {
        AppUserImAccount account = pending(userId, imUserId);
        account.setSyncStatus("synced");
        return account;
    }

    private AppUserImAccount pending(Long userId, String imUserId) {
        AppUserImAccount account = new AppUserImAccount();
        account.setId(userId + 100L);
        account.setUserId(userId);
        account.setImUserId(imUserId);
        account.setSyncStatus("pending");
        account.setVersion(0);
        return account;
    }

    private static final class CapturingTransport implements TencentImHttpTransport {
        private URI uri;
        private String requestBody;
        private String responseBody;

        @Override
        public TencentImHttpResponse post(URI uri, String requestBody) {
            this.uri = uri;
            this.requestBody = requestBody;
            return new TencentImHttpResponse(200, responseBody);
        }
    }
}
