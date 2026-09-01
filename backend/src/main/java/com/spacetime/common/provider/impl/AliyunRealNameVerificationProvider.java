package com.spacetime.common.provider.impl;

import com.aliyun.dytnsapi20200217.Client;
import com.aliyun.dytnsapi20200217.models.CertNoTwoElementVerificationRequest;
import com.aliyun.dytnsapi20200217.models.CertNoTwoElementVerificationResponse;
import com.aliyun.tea.TeaException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.provider.ProviderCheckResult;
import com.spacetime.common.provider.RealNameVerificationProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RequiredArgsConstructor
public class AliyunRealNameVerificationProvider implements RealNameVerificationProvider {
    private final Client client;
    private final ObjectMapper objectMapper;
    private final RealNameVerificationProperties properties;

    @Override
    public ProviderCheckResult check(String realName, String idCardNo) {
        try {
            CertNoTwoElementVerificationRequest request = new CertNoTwoElementVerificationRequest()
                    .setAuthCode(properties.getAuthCode())
                    .setCertName(realName)
                    .setCertNo(idCardNo);
            CertNoTwoElementVerificationResponse response = client.certNoTwoElementVerification(request);
            var body = response.getBody();
            String raw = objectMapper.writeValueAsString(body);
            if (body == null || !"OK".equalsIgnoreCase(body.getCode()) || body.getData() == null) {
                return ProviderCheckResult.pending("ALIYUN_ID_2ELEMENT", raw, false, null,
                        "阿里云二要素接口未返回可判定结果");
            }
            String result = body.getData().getIsConsistent();
            if ("1".equals(result)) {
                return ProviderCheckResult.safe("ALIYUN_ID_2ELEMENT", raw, false);
            }
            if ("0".equals(result)) {
                return ProviderCheckResult.unsafe("ALIYUN_ID_2ELEMENT", raw, false,
                        "姓名与身份证号不一致");
            }
            return ProviderCheckResult.pending("ALIYUN_ID_2ELEMENT", raw, false, null,
                    "阿里云查无身份记录，转人工审核");
        } catch (TeaException ex) {
            if ("InvalidParameter".equalsIgnoreCase(ex.getCode())) {
                return ProviderCheckResult.unsafe("ALIYUN_ID_2ELEMENT", "{\"error\":\"invalid_parameter\"}",
                        false, ex.getMessage());
            }
            log.warn("阿里云身份证二要素核验调用失败", ex);
            return ProviderCheckResult.pending("ALIYUN_ID_2ELEMENT", "{\"error\":\"provider_unavailable\"}",
                    false, null, "实名认证服务暂不可用，转人工审核");
        } catch (Exception ex) {
            log.warn("阿里云身份证二要素核验调用失败", ex);
            return ProviderCheckResult.pending("ALIYUN_ID_2ELEMENT", "{\"error\":\"provider_unavailable\"}",
                    false, null, "实名认证服务暂不可用，转人工审核");
        }
    }
}
