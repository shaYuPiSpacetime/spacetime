package com.spacetime.common.service;

import com.spacetime.common.config.WechatVirtualPayProperties;
import com.spacetime.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Map;

/**
 * 微信虚拟支付线上版本的已发布商品快照。
 * 新增商品或调价时，须先在微信平台发布并同步更新此目录。
 */
@Component
@RequiredArgsConstructor
public class WechatVirtualProductCatalog {

    private static final Map<String, BigDecimal> ONLINE_PRICES = Map.of(
            "coin_10", new BigDecimal("99.00"),
            "coin_11", new BigDecimal("268.00"),
            "coin_12", new BigDecimal("428.00"),
            "vip_7", new BigDecimal("0.01"),
            "vip_8", new BigDecimal("1.00"),
            "vip_10", new BigDecimal("1000.00")
    );

    private final WechatVirtualPayProperties properties;

    public boolean isProductionMode() {
        return properties.isEnabled() && properties.getEnv() == 0;
    }

    public BigDecimal expectedPrice(String productId) {
        return ONLINE_PRICES.get(productId);
    }

    public boolean matches(String productId, BigDecimal price) {
        BigDecimal expected = expectedPrice(productId);
        return expected != null && price != null && expected.compareTo(price) == 0;
    }

    public void assertPayable(String productId, BigDecimal price) {
        BigDecimal expected = expectedPrice(productId);
        if (expected == null) {
            throw new BusinessException("商品 " + productId + " 尚未在微信虚拟支付线上版本配置，请先发布商品再上架");
        }
        if (price == null || expected.compareTo(price) != 0) {
            throw new BusinessException("商品 " + productId + " 的价格与微信线上版本不一致，应为 "
                    + expected.toPlainString() + " 元，请先同步价格后重试");
        }
    }
}
