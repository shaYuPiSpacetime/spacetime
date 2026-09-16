package com.spacetime.common.service;

import com.spacetime.common.config.WechatVirtualPayProperties;
import com.spacetime.common.exception.BusinessException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WechatVirtualProductCatalogTest {

    @Test
    void onlineCatalogMatchesSixPublishedProductPrices() {
        Map<String, String> prices = Map.of(
                "coin_10", "99.00",
                "coin_11", "268.00",
                "coin_12", "428.00",
                "vip_7", "0.01",
                "vip_8", "1.00",
                "vip_10", "1000.00"
        );
        WechatVirtualProductCatalog catalog = catalog();
        prices.forEach((id, expected) ->
                assertThat(catalog.expectedPrice(id)).as(id).isEqualByComparingTo(expected));
    }

    @Test
    void onlineCatalogRejectsUnknownOrMismatchedProductsWithoutRounding() {
        WechatVirtualProductCatalog catalog = catalog();
        assertThatThrownBy(() -> catalog.assertPayable("vip_7", new BigDecimal("0.02")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("vip_7")
                .hasMessageContaining("0.01");
        assertThatThrownBy(() -> catalog.assertPayable("coin_999", new BigDecimal("99.00")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("coin_999");
        catalog.assertPayable("vip_7", new BigDecimal("0.01"));
    }

    private WechatVirtualProductCatalog catalog() {
        WechatVirtualPayProperties properties = new WechatVirtualPayProperties();
        properties.setEnabled(true);
        properties.setEnv(0);
        return new WechatVirtualProductCatalog(properties);
    }
}
