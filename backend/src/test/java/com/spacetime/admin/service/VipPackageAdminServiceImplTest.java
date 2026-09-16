package com.spacetime.admin.service;

import com.spacetime.admin.dto.request.VipPackageSaveReq;
import com.spacetime.admin.service.impl.VipPackageAdminServiceImpl;
import com.spacetime.common.config.WechatVirtualPayProperties;
import com.spacetime.common.dao.VipPackageDao;
import com.spacetime.common.entity.VipPackage;
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
class VipPackageAdminServiceImplTest {

    @Mock
    private VipPackageDao vipPackageDao;
    private final WechatVirtualPayProperties payProperties = new WechatVirtualPayProperties();

    private VipPackageAdminServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new VipPackageAdminServiceImpl(vipPackageDao, new WechatVirtualProductCatalog(payProperties));
    }

    @Test
    @DisplayName("独立套餐接口拒绝非一次性购买")
    void create_shouldRejectRecurringPurchaseMode() {
        VipPackageSaveReq req = validRequest();
        req.setSubscriptionType("year");

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("普通套餐和一次性购买");
        verify(vipPackageDao, never()).insert(any());
    }

    @Test
    @DisplayName("线上虚拟支付禁止无商品 ID 的新套餐直接启用")
    void create_shouldRejectEnabledPackageBeforeProductPublished() {
        enableProductionVirtualPay();

        assertThatThrownBy(() -> service.create(validRequest()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("先创建停用");
        verify(vipPackageDao, never()).insert(any());
    }

    @Test
    @DisplayName("线上虚拟支付拒绝不匹配已发布商品的改价")
    void update_shouldRejectPriceMismatch() {
        enableProductionVirtualPay();
        VipPackage existing = existingPackage(7L, "0.01", "ENABLED");
        when(vipPackageDao.selectById(7L)).thenReturn(existing);
        VipPackageSaveReq req = validRequest();
        req.setPrice(new BigDecimal("0.02"));

        assertThatThrownBy(() -> service.update(7L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("vip_7")
                .hasMessageContaining("0.01");
        verify(vipPackageDao, never()).updateById(any());
    }

    @Test
    @DisplayName("旧价格未变允许修改会员套餐名称")
    void update_shouldAllowUnrelatedEditWhenPriceUnchanged() {
        enableProductionVirtualPay();
        VipPackage existing = existingPackage(7L, "568.00", "ENABLED");
        when(vipPackageDao.selectById(7L)).thenReturn(existing);

        service.update(7L, validRequest());

        verify(vipPackageDao).updateById(any());
    }

    @Test
    @DisplayName("旧套餐重新上架必须匹配线上价格")
    void updateStatus_shouldRejectMismatchWhenReenabling() {
        enableProductionVirtualPay();
        VipPackage existing = existingPackage(7L, "568.00", "DISABLED");
        when(vipPackageDao.selectById(7L)).thenReturn(existing);

        assertThatThrownBy(() -> service.updateStatus(7L, "ENABLED"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("vip_7");
        verify(vipPackageDao, never()).updateById(any());
    }

    private void enableProductionVirtualPay() {
        payProperties.setEnabled(true);
        payProperties.setEnv(0);
    }

    private VipPackage existingPackage(Long id, String price, String status) {
        VipPackage entity = new VipPackage();
        entity.setId(id);
        entity.setPrice(new BigDecimal(price));
        entity.setStatus(status);
        return entity;
    }

    private VipPackageSaveReq validRequest() {
        VipPackageSaveReq req = new VipPackageSaveReq();
        req.setPackageName("普通年卡");
        req.setPackageType("normal");
        req.setSubscriptionType("once");
        req.setPrice(new BigDecimal("568.00"));
        req.setDurationDays(365);
        req.setStatus("ENABLED");
        return req;
    }
}
