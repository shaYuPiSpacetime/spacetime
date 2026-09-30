package com.spacetime.miniapp.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.config.WechatPayProperties;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.miniapp.service.WechatPayService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ResourceLoader;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

/** 普通微信支付结果解析回归测试。 */
@DisplayName("普通微信支付服务安全测试")
class WechatPayServiceImplTest {

    @Test
    @DisplayName("微信查单解析保留订单金额、应用及商户身份")
    void queryOrderParserShouldKeepPaymentEvidence() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        WechatPayServiceImpl service = new WechatPayServiceImpl(
                new WechatPayProperties(), mock(ResourceLoader.class), mapper);
        String payload = "{\"out_trade_no\":\"TO12345678\","
                + "\"transaction_id\":\"WX-1\",\"trade_state\":\"SUCCESS\","
                + "\"amount\":{\"total\":100},\"appid\":\"test-app\","
                + "\"mchid\":\"test-merchant\"}";
        WechatPayService.WechatPayNotifyResult result =
                service.parseTradeResult(mapper.readTree(payload), payload);

        assertThat(result.tradeState()).isEqualTo("SUCCESS");
        assertThat(result.totalFeeFen()).isEqualTo(100);
        assertThat(result.appId()).isEqualTo("test-app");
        assertThat(result.mchId()).isEqualTo("test-merchant");
    }

    @Test
    @DisplayName("微信查单缺少交易状态时不能默认成支付成功")
    void queryOrderParserShouldNotDefaultToSuccess() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        WechatPayServiceImpl service = new WechatPayServiceImpl(
                new WechatPayProperties(), mock(ResourceLoader.class), mapper);
        WechatPayService.WechatPayNotifyResult result =
                service.parseTradeResult(
                        mapper.readTree("{\"out_trade_no\":\"TO12345678\"}"), "{}");

        assertThat(result.tradeState()).isBlank();
        assertThat(result.totalFeeFen()).isEqualTo(-1);
    }

    @Test
    @DisplayName("支付回调不接受未加密的订单 JSON")
    void parseNotifyRejectsPlainOrderJson() {
        WechatPayProperties properties = new WechatPayProperties();
        properties.setAppId("test-app");
        properties.setMchId("test-merchant");
        properties.setApiV3Key("test-key");
        properties.setCertSerialNo("test-serial");
        properties.setPrivateKeyPath("test-path");
        properties.setNotifyUrl("https://example.invalid/notify");
        WechatPayServiceImpl service = new WechatPayServiceImpl(
                properties, mock(ResourceLoader.class), new ObjectMapper());

        assertThatThrownBy(() -> service.parseNotify(
                "{\"out_trade_no\":\"VIP202605280001\",\"trade_state\":\"SUCCESS\"}"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("回调");
    }
}
