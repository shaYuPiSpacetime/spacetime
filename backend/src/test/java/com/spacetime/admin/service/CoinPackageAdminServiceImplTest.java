package com.spacetime.admin.service;

import com.spacetime.admin.dto.request.CoinPackageSaveReq;
import com.spacetime.admin.service.impl.CoinPackageAdminServiceImpl;
import com.spacetime.common.config.WechatVirtualPayProperties;
import com.spacetime.common.dao.CoinPackageDao;
import com.spacetime.common.entity.CoinPackage;
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
class CoinPackageAdminServiceImplTest {

    @Mock
    private CoinPackageDao coinPackageDao;
    @Mock
    private VirtualPriceChangeService priceChangeService;
    private final WechatVirtualPayProperties payProperties = new WechatVirtualPayProperties();
    private CoinPackageAdminServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new CoinPackageAdminServiceImpl(coinPackageDao,
                new WechatVirtualProductCatalog(payProperties), priceChangeService);
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
    @DisplayName("线上币包改价排队后保持旧有效价和商品 ID")
    void update_shouldQueueEffectivePriceAndKeepActiveOffer() {
        enableProductionVirtualPay();
        CoinPackage existing = existingPackage(11L, "268.00", "ENABLED");
        existing.setWechatProductId("coin_11");
        when(coinPackageDao.selectForUpdate(11L)).thenReturn(existing);
        CoinPackageSaveReq req = validRequest();
        req.setDiscountAmount(new BigDecimal("267.00"));

        service.update(11L, req);

        verify(priceChangeService).requestChange("coin", 11L, "coin_11", new BigDecimal("267.00"), false);
        verify(coinPackageDao).updateById(existing);
        assertThat(existing.getAmount()).isEqualByComparingTo("268.00");
        assertThat(existing.getDiscountAmount()).isNull();
        assertThat(existing.getWechatProductId()).isEqualTo("coin_11");
    }

    @Test
    @DisplayName("有效售价未变允许修改币包其他字段")
    void update_shouldAllowUnrelatedEditWhenPriceUnchanged() {
        enableProductionVirtualPay();
        when(coinPackageDao.selectForUpdate(11L)).thenReturn(existingPackage(11L, "268.00", "ENABLED"));

        service.update(11L, validRequest());

        verify(coinPackageDao).updateById(any());
    }

    @Test
    @DisplayName("千寻币待生效报价改回当前价时撤销待处理任务")
    void update_shouldCancelPendingPriceWhenReverted() {
        enableProductionVirtualPay();
        CoinPackage existing = existingPackage(11L, "268.00", "ENABLED");
        when(coinPackageDao.selectForUpdate(11L)).thenReturn(existing);
        VirtualPriceChange pending = new VirtualPriceChange();
        pending.setStatus("QUEUED");
        pending.setTargetPrice(new BigDecimal("267.00"));
        when(priceChangeService.latest("coin", 11L)).thenReturn(pending);

        service.update(11L, validRequest());

        verify(priceChangeService).cancelChange("coin", 11L);
    }

    @Test
    @DisplayName("旧币包重新上架必须具备合法的当前商品 ID")
    void updateStatus_shouldRejectInvalidProductIdWhenReenabling() {
        enableProductionVirtualPay();
        CoinPackage existing = existingPackage(11L, "280.00", "DISABLED");
        existing.setWechatProductId("invalid!");
        when(coinPackageDao.selectForUpdate(11L)).thenReturn(existing);

        assertThatThrownBy(() -> service.updateStatus(11L, "ENABLED"))
                .isInstanceOf(BusinessException.class);
        verify(coinPackageDao, never()).updateById(any());
    }

    @Test
    @DisplayName("停用的新千寻币套餐无商品 ID 时启用请求先发布商品并保持停用")
    void updateStatus_shouldQueuePublicationBeforeEnablingNewPackage() {
        enableProductionVirtualPay();
        CoinPackage existing = existingPackage(11L, "268.00", "DISABLED");
        when(coinPackageDao.selectForUpdate(11L)).thenReturn(existing);

        service.updateStatus(11L, "ENABLED");

        verify(priceChangeService).requestChange("coin", 11L, null, new BigDecimal("268.00"), true);
        verify(coinPackageDao, never()).updateById(any());
        assertThat(existing.getStatus()).isEqualTo("DISABLED");
    }

    @Test
    @DisplayName("编辑停用币包并请求启用时先同步新商品")
    void update_shouldQueuePublicationBeforeEnablingNewPackage() {
        enableProductionVirtualPay();
        CoinPackage existing = existingPackage(11L, "268.00", "DISABLED");
        when(coinPackageDao.selectForUpdate(11L)).thenReturn(existing);

        service.update(11L, validRequest());

        verify(priceChangeService).requestChange("coin", 11L, null, new BigDecimal("268.00"), true);
        assertThat(existing.getStatus()).isEqualTo("DISABLED");
        assertThat(existing.getAmount()).isEqualByComparingTo("268.00");
    }

    @Test
    @DisplayName("千寻币详情返回待生效价和同步状态")
    void detail_shouldReturnPendingPriceChange() {
        CoinPackage existing = existingPackage(11L, "268.00", "ENABLED");
        when(coinPackageDao.selectById(11L)).thenReturn(existing);
        VirtualPriceChange change = new VirtualPriceChange();
        change.setTargetPrice(new BigDecimal("267.00"));
        change.setNewProductId("coin_11_v2");
        change.setStatus("PUBLISHING");
        when(priceChangeService.latest("coin", 11L)).thenReturn(change);

        var detail = service.detail(11L);

        assertThat(detail.getAmount()).isEqualByComparingTo("268.00");
        assertThat(detail.getPendingPrice()).isEqualByComparingTo("267.00");
        assertThat(detail.getPendingProductId()).isEqualTo("coin_11_v2");
        assertThat(detail.getPriceChangeStatus()).isEqualTo("PUBLISHING");
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
