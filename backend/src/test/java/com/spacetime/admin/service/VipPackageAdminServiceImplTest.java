package com.spacetime.admin.service;

import com.spacetime.admin.dto.request.VipPackageSaveReq;
import com.spacetime.admin.service.impl.VipPackageAdminServiceImpl;
import com.spacetime.common.config.WechatVirtualPayProperties;
import com.spacetime.common.dao.VipPackageDao;
import com.spacetime.common.entity.VipPackage;
import com.spacetime.common.entity.VirtualPriceChange;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.VirtualPriceChangeService;
import com.spacetime.common.service.WechatVirtualProductCatalog;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VipPackageAdminServiceImplTest {

    @Mock
    private VipPackageDao vipPackageDao;
    @Mock
    private VirtualPriceChangeService priceChangeService;
    private final WechatVirtualPayProperties payProperties = new WechatVirtualPayProperties();

    private VipPackageAdminServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new VipPackageAdminServiceImpl(vipPackageDao,
                new WechatVirtualProductCatalog(payProperties), priceChangeService);
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
    @DisplayName("线上会员改价排队后仍保持旧售价和当前商品 ID")
    void update_shouldQueuePriceAndKeepActiveOffer() {
        enableProductionVirtualPay();
        VipPackage existing = existingPackage(7L, "0.01", "ENABLED");
        existing.setWechatProductId("vip_7");
        when(vipPackageDao.selectForUpdate(7L)).thenReturn(existing);
        VipPackageSaveReq req = validRequest();
        req.setPrice(new BigDecimal("0.02"));
        req.setWechatProductId("forged_sku");

        service.update(7L, req);

        verify(priceChangeService).requestChange("vip", 7L, "vip_7", new BigDecimal("0.02"), false);
        verify(vipPackageDao).updateById(existing);
        assertThat(existing.getPrice()).isEqualByComparingTo("0.01");
        assertThat(existing.getWechatProductId()).isEqualTo("vip_7");
    }

    @Test
    @DisplayName("旧价格未变允许修改会员套餐名称")
    void update_shouldAllowUnrelatedEditWhenPriceUnchanged() {
        enableProductionVirtualPay();
        VipPackage existing = existingPackage(7L, "568.00", "ENABLED");
        when(vipPackageDao.selectForUpdate(7L)).thenReturn(existing);

        service.update(7L, validRequest());

        verify(vipPackageDao).updateById(any());
    }

    @Test
    @DisplayName("会员待生效报价改回当前价时撤销待处理任务")
    void update_shouldCancelPendingPriceWhenReverted() {
        enableProductionVirtualPay();
        VipPackage existing = existingPackage(7L, "568.00", "ENABLED");
        when(vipPackageDao.selectForUpdate(7L)).thenReturn(existing);
        VirtualPriceChange pending = new VirtualPriceChange();
        pending.setStatus("QUEUED");
        pending.setTargetPrice(new BigDecimal("600.00"));
        when(priceChangeService.latest("vip", 7L)).thenReturn(pending);

        service.update(7L, validRequest());

        verify(priceChangeService).cancelChange("vip", 7L);
    }

    @Test
    @DisplayName("旧套餐重新上架必须具备合法的当前商品 ID")
    void updateStatus_shouldRejectInvalidProductIdWhenReenabling() {
        enableProductionVirtualPay();
        VipPackage existing = existingPackage(7L, "568.00", "DISABLED");
        existing.setWechatProductId("invalid!");
        when(vipPackageDao.selectForUpdate(7L)).thenReturn(existing);

        assertThatThrownBy(() -> service.updateStatus(7L, "ENABLED"))
                .isInstanceOf(BusinessException.class);
        verify(vipPackageDao, never()).updateById(any());
    }

    @Test
    @DisplayName("停用的新会员套餐无商品 ID 时启用请求先发布商品并保持停用")
    void updateStatus_shouldQueuePublicationBeforeEnablingNewPackage() {
        enableProductionVirtualPay();
        VipPackage existing = existingPackage(7L, "568.00", "DISABLED");
        when(vipPackageDao.selectForUpdate(7L)).thenReturn(existing);

        service.updateStatus(7L, "ENABLED");

        verify(priceChangeService).requestChange("vip", 7L, null, new BigDecimal("568.00"), true);
        verify(vipPackageDao, never()).updateById(any());
        assertThat(existing.getStatus()).isEqualTo("DISABLED");
    }

    @Test
    @DisplayName("编辑停用会员套餐并请求启用时先同步新商品")
    void update_shouldQueuePublicationBeforeEnablingNewPackage() {
        enableProductionVirtualPay();
        VipPackage existing = existingPackage(7L, "568.00", "DISABLED");
        when(vipPackageDao.selectForUpdate(7L)).thenReturn(existing);

        service.update(7L, validRequest());

        verify(priceChangeService).requestChange("vip", 7L, null, new BigDecimal("568.00"), true);
        assertThat(existing.getStatus()).isEqualTo("DISABLED");
        assertThat(existing.getPrice()).isEqualByComparingTo("568.00");
    }

    @Test
    @DisplayName("会员详情返回待生效价格和同步状态")
    void detail_shouldReturnPendingPriceChange() {
        VipPackage existing = existingPackage(7L, "0.01", "ENABLED");
        when(vipPackageDao.selectById(7L)).thenReturn(existing);
        VirtualPriceChange change = new VirtualPriceChange();
        change.setTargetPrice(new BigDecimal("0.02"));
        change.setNewProductId("vip_7_v2");
        change.setStatus("UPLOADING");
        when(priceChangeService.latest("vip", 7L)).thenReturn(change);

        var detail = service.detail(7L);

        assertThat(detail.getPrice()).isEqualByComparingTo("0.01");
        assertThat(detail.getPendingPrice()).isEqualByComparingTo("0.02");
        assertThat(detail.getPendingProductId()).isEqualTo("vip_7_v2");
        assertThat(detail.getPriceChangeStatus()).isEqualTo("UPLOADING");
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
