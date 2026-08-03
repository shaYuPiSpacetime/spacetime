package com.spacetime.common.provider.impl;

import com.aliyun.dysmsapi20170525.Client;
import com.aliyun.dysmsapi20170525.models.SendSmsRequest;
import com.aliyun.dysmsapi20170525.models.SendSmsResponse;
import com.aliyun.dysmsapi20170525.models.SendSmsResponseBody;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("阿里云手机号登录短信 Provider")
class AliyunSmsCodeProviderTest {

    private Client client;
    private AliyunSmsCodeProvider provider;

    @BeforeEach
    void setUp() {
        client = mock(Client.class);
        AliyunSmsProperties properties = new AliyunSmsProperties();
        properties.setSignName("上海兴家立业网络科技");
        properties.setTemplateCode("SMS_336060313");
        provider = new AliyunSmsCodeProvider(client, new ObjectMapper(), properties);
    }

    @Test
    @DisplayName("发送验证码使用指定签名、模板和唯一 code 参数")
    void shouldSendConfiguredLoginTemplate() throws Exception {
        when(client.sendSms(any(SendSmsRequest.class))).thenReturn(response("OK", "OK"));

        provider.sendLoginCode("13800138000", "123456", 5);

        ArgumentCaptor<SendSmsRequest> captor = ArgumentCaptor.forClass(SendSmsRequest.class);
        verify(client).sendSms(captor.capture());
        SendSmsRequest request = captor.getValue();
        assertThat(request.getPhoneNumbers()).isEqualTo("13800138000");
        assertThat(request.getSignName()).isEqualTo("上海兴家立业网络科技");
        assertThat(request.getTemplateCode()).isEqualTo("SMS_336060313");
        assertThat(request.getTemplateParam()).isEqualTo("{\"code\":\"123456\"}");
        assertThat(provider.providerCode()).isEqualTo("ALIYUN_SMS");
    }

    @Test
    @DisplayName("阿里云业务响应非 OK 时发送失败")
    void shouldRejectNonOkResponse() throws Exception {
        when(client.sendSms(any(SendSmsRequest.class)))
                .thenReturn(response("isv.SMS_SIGNATURE_ILLEGAL", "签名不合法"));

        assertThatThrownBy(() -> provider.sendLoginCode("13800138000", "123456", 5))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("isv.SMS_SIGNATURE_ILLEGAL");
    }

    @Test
    @DisplayName("阿里云缺少响应体时发送失败")
    void shouldRejectMissingResponseBody() throws Exception {
        when(client.sendSms(any(SendSmsRequest.class))).thenReturn(new SendSmsResponse());

        assertThatThrownBy(() -> provider.sendLoginCode("13800138000", "123456", 5))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("EMPTY_RESPONSE");
    }

    private SendSmsResponse response(String code, String message) {
        SendSmsResponseBody body = new SendSmsResponseBody()
                .setCode(code)
                .setMessage(message);
        return new SendSmsResponse().setBody(body);
    }
}
