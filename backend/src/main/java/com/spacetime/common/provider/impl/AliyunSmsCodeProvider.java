package com.spacetime.common.provider.impl;

import com.aliyun.dysmsapi20170525.Client;
import com.aliyun.dysmsapi20170525.models.SendSmsRequest;
import com.aliyun.dysmsapi20170525.models.SendSmsResponse;
import com.aliyun.dysmsapi20170525.models.SendSmsResponseBody;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.provider.SmsCodeProvider;

import java.util.Map;

/** 使用阿里云短信模板发送手机号登录验证码。 */
public class AliyunSmsCodeProvider implements SmsCodeProvider {

    private static final String SUCCESS_CODE = "OK";

    private final Client client;
    private final ObjectMapper objectMapper;
    private final AliyunSmsProperties properties;

    public AliyunSmsCodeProvider(Client client,
                                ObjectMapper objectMapper,
                                AliyunSmsProperties properties) {
        this.client = client;
        this.objectMapper = objectMapper;
        this.properties = properties;
    }

    @Override
    public String providerCode() {
        return "ALIYUN_SMS";
    }

    @Override
    public void sendLoginCode(String phone, String code, int validMinutes) {
        SendSmsRequest request = new SendSmsRequest()
                .setPhoneNumbers(phone)
                .setSignName(properties.getSignName())
                .setTemplateCode(properties.getTemplateCode())
                .setTemplateParam(templateParam(code));

        SendSmsResponse response;
        try {
            response = client.sendSms(request);
        } catch (Exception ex) {
            throw new IllegalStateException("阿里云短信请求失败", ex);
        }

        SendSmsResponseBody body = response == null ? null : response.getBody();
        if (body == null) {
            throw new IllegalStateException("阿里云短信发送失败，code=EMPTY_RESPONSE");
        }
        if (!SUCCESS_CODE.equals(body.getCode())) {
            throw new IllegalStateException("阿里云短信发送失败，code=" + safeCode(body.getCode()));
        }
    }

    private String templateParam(String code) {
        try {
            return objectMapper.writeValueAsString(Map.of("code", code));
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("短信模板参数生成失败", ex);
        }
    }

    private String safeCode(String code) {
        return code == null || code.isBlank() ? "UNKNOWN" : code;
    }
}
