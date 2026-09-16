package com.spacetime.admin.service;

import com.spacetime.admin.dto.request.CoinPackageSaveReq;
import com.spacetime.admin.service.impl.CoinPackageAdminServiceImpl;
import com.spacetime.common.config.WechatVirtualPayProperties;
import com.spacetime.common.dao.CoinPackageDao;
import com.spacetime.common.entity.CoinPackage;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.WechatVirtualProductCatalog;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CoinPackageAdminServiceImplTest {

    @Mock
    private CoinPackageDao coinPackageDao;
    private final WechatVirtualPayProperties payProperties = new WechatVirtualPayProperties();
    private CoinPackageAdminServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new CoinPackageAdminServiceImpl(coinPackageDao, new WechatVirtualProductCatalog(payProperties));
    }

    @Test
    @DisplayName("线上虚拟支付禁止无商品 ID 的新币包直接启用")
    void create_shouldRejectEnabledPackageBeforeProductPublished() {
        enableProductionVirtualPay();

        assertThatThrownBy(() -> service.create(validRequest()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("先创建停用");
        verify(coinPackageDao, never()).insert(any());
    }

    @Test
    @DisplayName("线上虚拟支付按优惠后有效价校验改价")
    void update_shouldRejectEffectivePriceMismatch() {
        enableProductionVirtualPay();
        when(coinPackageDao.selectById(11L)).thenReturn(existingPackage(11L, "268.00", "ENABLED"));
        CoinPackageSaveReq req = validRequest();
        req.setDiscountAmount(new BigDecimal("267.00"));

        assertThatThrownBy(() -> service.update(11L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("coin_11")
                .hasMessageContaining("268.00");
        verify(coinPackageDao, never()).updateById(any());
    }

    @Test
    @DisplayName("有效售价未变允许修改币包其他字段")
    void update_shouldAllowUnrelatedEditWhenPriceUnchanged() {
        enableProductionVirtualPay();
        when(coinPackageDao.selectById(11L)).thenReturn(existingPackage(11L, "268.00", "ENABLED"));

        service.update(11L, validRequest());

        verify(coinPackageDao).updateById(any());
    }

    @Test
    @DisplayName("旧币包重新上架必须匹配线上价格")
    void updateStatus_shouldRejectMismatchWhenReenabling() {
        enableProductionVirtualPay();
        when(coinPackageDao.selectById(11L)).thenReturn(existingPackage(11L, "280.00", "DISABLED"));

        assertThatThrownBy(() -> service.updateStatus(11L, "ENABLED"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("coin_11");
        verify(coinPackageDao, never()).updateById(any());
    }

    private void enableProductionVirtualPay() {
        payProperties.setEnabled(true);
        payProperties.setEnv(0);
    }

    private CoinPackageSaveReq validRequest() {
        CoinPackageSaveReq req = new CoinPackageSaveReq();
        req.setPackageName("3000 千寻币");
        req.setAmount(new BigDecimal("268.00"));
        req.setDiscountAmount(new BigDecimal("268.00"));
        req.setCoinCount(3000);
        req.setStatus("ENABLED");
        return req;
    }

    private CoinPackage existingPackage(Long id, String amount, String status) {
        CoinPackage entity = new CoinPackage();
        entity.setId(id);
        entity.setAmount(new BigDecimal(amount));
        entity.setStatus(status);
        return entity;
    }
}
