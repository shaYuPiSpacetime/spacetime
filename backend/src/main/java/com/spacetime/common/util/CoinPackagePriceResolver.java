package com.spacetime.common.util;

import com.spacetime.common.entity.CoinPackage;

import java.math.BigDecimal;

/**
 * 千寻币套餐有效支付价解析器。
 */
public final class CoinPackagePriceResolver {

    private CoinPackagePriceResolver() {
    }

    /**
     * 优惠价存在时以优惠价为准，否则兼容历史数据中的售价。
     *
     * @param coinPackage 千寻币套餐
     * @return 当前有效支付价
     */
    public static BigDecimal resolve(CoinPackage coinPackage) {
        return coinPackage.getDiscountAmount() != null
                ? coinPackage.getDiscountAmount()
                : coinPackage.getAmount();
    }
}
