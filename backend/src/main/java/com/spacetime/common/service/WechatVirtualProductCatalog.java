package com.spacetime.common.service;

import com.spacetime.common.config.WechatVirtualPayProperties;
import com.spacetime.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * 对当前生效的微信虚拟商品标识与金额进行格式校验。
 * 是否已发布由改价任务确认，不再使用代码内的固定价格表。
 */
@Component
@RequiredArgsConstructor
public class WechatVirtualProductCatalog {

    private final WechatVirtualPayProperties properties;

    public boolean isProductionMode() {
        return properties.isEnabled() && properties.getEnv() == 0;
    }

    public boolean matches(String productId, BigDecimal price) {
        return productId != null && productId.matches("[A-Za-z0-9_-]{1,20}")
                && price != null && price.signum() > 0 && price.scale() <= 2
                && price.movePointRight(2).compareTo(BigDecimal.valueOf(Integer.MAX_VALUE)) <= 0;
    }

    public void assertPayable(String productId, BigDecimal price) {
        if (!matches(productId, price)) {
            throw new BusinessException("当前商品 ID 或价格不合法，请联系工作人员处理");
        }
    }
}
