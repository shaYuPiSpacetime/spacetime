package com.spacetime.miniapp.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.miniapp.service.impl.WechatMessagePushRouterServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WechatMessagePushRouterServiceImplTest {
    @Mock private CommunityMediaAuditCallbackService mediaAuditCallbackService;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private WechatMessagePushRouterServiceImpl router;

    @BeforeEach
    void setUp() {
        router = new WechatMessagePushRouterServiceImpl(mediaAuditCallbackService, objectMapper);
    }

    @Test
    void textMessage_shouldTransferWithSwappedRecipients() throws Exception {
        String reply = routeJson(customerMessage("text"));

        JsonNode response = objectMapper.readTree(reply);
        assertThat(response.path("ToUserName").asText()).isEqualTo("user-openid");
        assertThat(response.path("FromUserName").asText()).isEqualTo("miniapp-id");
        assertThat(response.path("MsgType").asText()).isEqualTo("transfer_customer_service");
        assertThat(response.path("CreateTime").asLong()).isPositive();
        verify(mediaAuditCallbackService, never()).handleRaw(anyString(), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void imageAndMiniProgramCard_shouldTransfer() throws Exception {
        for (String messageType : new String[]{"image", "miniprogrampage"}) {
            JsonNode response = objectMapper.readTree(routeJson(customerMessage(messageType)));
            assertThat(response.path("MsgType").asText()).isEqualTo("transfer_customer_service");
        }
        verify(mediaAuditCallbackService, never()).handleRaw(anyString(), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void enterSessionEvent_shouldNotTransferOrTouchMediaAudit() {
        String event = "{\"ToUserName\":\"miniapp-id\",\"FromUserName\":\"user-openid\","
                + "\"MsgType\":\"event\",\"Event\":\"user_enter_tempsession\"}";

        assertThat(routeJson(event)).isEqualTo("success");
        verify(mediaAuditCallbackService, never()).handleRaw(anyString(), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void mediaAuditJson_shouldDelegateOriginalPayload() {
        String audit = "{\"Event\":\"wxa_media_check\",\"trace_id\":\"trace-1\","
                + "\"result\":{\"suggest\":\"pass\"}}";

        assertThat(routeJson(audit)).isEqualTo("success");
        verify(mediaAuditCallbackService).handleRaw("sig", "123", "nonce", "application/json", audit);
    }

    @Test
    void legacyMediaAuditWithoutEvent_shouldStillDelegate() {
        String audit = "{\"trace_id\":\"trace-2\",\"result\":{\"suggest\":\"pass\"}}";

        assertThat(routeJson(audit)).isEqualTo("success");
        verify(mediaAuditCallbackService).handleRaw("sig", "123", "nonce", "application/json", audit);
    }

    @Test
    void mediaAuditXml_shouldStillDelegateOriginalPayload() {
        String audit = "<xml><Event>wxa_media_check</Event><trace_id>trace-3</trace_id>"
                + "<detail><suggest>pass</suggest></detail></xml>";

        assertThat(router.route("sig", "123", "nonce", "text/xml", audit)).isEqualTo("success");
        verify(mediaAuditCallbackService).handleRaw("sig", "123", "nonce", "text/xml", audit);
    }

    @Test
    void customerXml_shouldReturnXmlTransfer() {
        String customer = "<xml><ToUserName>miniapp-id</ToUserName><FromUserName>user-openid</FromUserName>"
                + "<MsgType>text</MsgType><Content>hello</Content></xml>";

        String reply = router.route("sig", "123", "nonce", "text/xml", customer);

        assertThat(reply).contains("<ToUserName>user-openid</ToUserName>")
                .contains("<FromUserName>miniapp-id</FromUserName>")
                .contains("<MsgType>transfer_customer_service</MsgType>");
    }

    @Test
    void missingCustomerIdentity_shouldFailClosed() {
        String customer = "{\"ToUserName\":\"miniapp-id\",\"MsgType\":\"text\"}";

        assertThatThrownBy(() -> routeJson(customer))
                .isInstanceOf(BusinessException.class)
                .hasMessage("wechat_customer_message_identity_missing");
    }

    @Test
    void malformedPayload_shouldFailClosed() {
        assertThatThrownBy(() -> routeJson("not json"))
                .isInstanceOf(BusinessException.class)
                .hasMessage("wechat_callback_payload_invalid");
    }

    @Test
    void xxePayload_shouldFailClosed() {
        String xml = "<!DOCTYPE xml [<!ENTITY xxe SYSTEM \"file:///etc/passwd\">]>"
                + "<xml><MsgType>text</MsgType><ToUserName>miniapp-id</ToUserName>"
                + "<FromUserName>&xxe;</FromUserName></xml>";

        assertThatThrownBy(() -> router.route("sig", "123", "nonce", "text/xml", xml))
                .isInstanceOf(BusinessException.class)
                .hasMessage("wechat_callback_payload_invalid");
    }

    @Test
    void invalidSignature_shouldRejectBeforePayloadParsing() {
        doThrow(new BusinessException(403, "media_callback_signature_invalid"))
                .when(mediaAuditCallbackService).validateSignature("bad", "123", "nonce");

        assertThatThrownBy(() -> router.route("bad", "123", "nonce", "application/json", "not json"))
                .isInstanceOf(BusinessException.class)
                .hasMessage("media_callback_signature_invalid");
    }

    @Test
    void oversizedPayload_shouldFailBeforeParsingAndNotInvokeAudit() {
        String oversized = "{" + "x".repeat(4 * 1024 * 1024) + "}";

        assertThatThrownBy(() -> routeJson(oversized))
                .isInstanceOf(BusinessException.class)
                .hasMessage("wechat_callback_payload_too_large");
        verify(mediaAuditCallbackService, never()).handleRaw(anyString(), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void multibytePayload_shouldBeLimitedByUtf8Bytes() {
        String oversized = "{\"Content\":\"" + "中".repeat(350_000) + "\"}";

        assertThatThrownBy(() -> routeJson(oversized))
                .isInstanceOf(BusinessException.class)
                .hasMessage("wechat_callback_payload_too_large");
    }

    private String routeJson(String payload) {
        return router.route("sig", "123", "nonce", "application/json", payload);
    }

    private String customerMessage(String messageType) {
        return "{\"ToUserName\":\"miniapp-id\",\"FromUserName\":\"user-openid\","
                + "\"CreateTime\":123,\"MsgType\":\"" + messageType + "\"}";
    }
}
