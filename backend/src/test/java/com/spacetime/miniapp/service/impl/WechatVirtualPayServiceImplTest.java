package com.spacetime.miniapp.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.config.WechatVirtualPayProperties;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.miniapp.dto.response.WechatVirtualPayParamsVO;
import com.spacetime.miniapp.service.WechatMiniappClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

@DisplayName("微信小程序虚拟支付服务测试")
class WechatVirtualPayServiceImplTest {

    private WechatVirtualPayProperties properties;
    private WechatVirtualPayServiceImpl service;

    @BeforeEach
    void setUp() {
        properties = new WechatVirtualPayProperties();
        properties.setEnabled(true);
        properties.setOfferId("offer-1");
        properties.setAppKey("app-key");
        properties.setEnv(0);
        service = new WechatVirtualPayServiceImpl(
                properties,
                mock(WechatMiniappClient.class),
                new ObjectMapper()
        );
    }

    @Test
    @DisplayName("构造道具直购参数时对同一份紧凑 JSON 计算双签名")
    void createPayParamsShouldUseExactSignDataForBothHmacSignatures() {
        WechatVirtualPayParamsVO result = service.createPayParams(
                "TO12345678",
                "vip_7",
                19800,
                "session-key"
        );

        assertThat(result.getMode()).isEqualTo("short_series_goods");
        assertThat(result.getSignData()).isEqualTo(
                "{\"offerId\":\"offer-1\",\"buyQuantity\":1,\"env\":0,"
                        + "\"currencyType\":\"CNY\",\"productId\":\"vip_7\","
                        + "\"goodsPrice\":19800,\"outTradeNo\":\"TO12345678\","
                        + "\"attach\":\"TO12345678\"}"
        );
        assertThat(result.getPaySig())
                .isEqualTo("545153dc905f8675100ae9b80ad5212754063bc435e86b3c56c194a184370615");
        assertThat(result.getSignature())
                .isEqualTo("369d63b3e6f2f685a762abf71890d308f17aab074f5e35f760ca30cd55555cd1");
    }

    @Test
    @DisplayName("启用虚拟支付但缺少现网 AppKey 时拒绝生成参数")
    void createPayParamsShouldRejectMissingAppKey() {
        properties.setAppKey(" ");

        assertThatThrownBy(() -> service.createPayParams(
                "TO12345678", "vip_7", 19800, "session-key"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("AppKey");
    }

    @Test
    @DisplayName("虚拟支付商品价格必须是正整数分")
    void createPayParamsShouldRejectInvalidPrice() {
        assertThatThrownBy(() -> service.createPayParams(
                "TO12345678", "vip_7", 0, "session-key"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("价格");
    }
}
