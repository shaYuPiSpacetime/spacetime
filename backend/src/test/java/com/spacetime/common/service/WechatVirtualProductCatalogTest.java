package com.spacetime.common.service;

import com.spacetime.common.config.WechatVirtualPayProperties;
import com.spacetime.common.exception.BusinessException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WechatVirtualProductCatalogTest {

    @Test
    void onlineCatalogAcceptsDynamicProductIdAndPositiveExactPrice() {
        WechatVirtualProductCatalog catalog = catalog();
        assertThat(catalog.matches("v7_0123456789abcdef", new BigDecimal("12.34"))).isTrue();
        assertThat(catalog.matches("c10_0123456789abcdef0", new BigDecimal("99.00"))).isFalse();
        assertThat(catalog.matches("vip_7", new BigDecimal("0.01"))).isTrue();
    }

    @Test
    void onlineCatalogRejectsInvalidProductIdAndNonFenPrice() {
        WechatVirtualProductCatalog catalog = catalog();
        assertThatThrownBy(() -> catalog.assertPayable(null, new BigDecimal("0.02")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("商品 ID");
        assertThatThrownBy(() -> catalog.assertPayable("coin_10", new BigDecimal("0.001")))
                .isInstanceOf(BusinessException.class);
        catalog.assertPayable("vip_7", new BigDecimal("0.01"));
    }

    private WechatVirtualProductCatalog catalog() {
        WechatVirtualPayProperties properties = new WechatVirtualPayProperties();
        properties.setEnabled(true);
        properties.setEnv(0);
        return new WechatVirtualProductCatalog(properties);
    }
}
