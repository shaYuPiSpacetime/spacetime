package com.spacetime.common.service;

import com.spacetime.common.config.WechatVirtualPayProperties;
import com.spacetime.common.dao.CoinPackageDao;
import com.spacetime.common.dao.VipPackageDao;
import com.spacetime.common.dao.VirtualPriceChangeDao;
import com.spacetime.common.entity.VirtualPriceChange;
import com.spacetime.common.entity.VipPackage;
import com.spacetime.common.entity.CoinPackage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VirtualPriceChangeServiceTest {
    @Mock private VirtualPriceChangeDao changeDao;
    @Mock private VipPackageDao vipPackageDao;
    @Mock private CoinPackageDao coinPackageDao;
    @Mock private VirtualGoodsGateway goodsGateway;
    private VirtualPriceChangeService service;

    @BeforeEach
    void setUp() {
        WechatVirtualPayProperties properties = new WechatVirtualPayProperties();
        properties.setEnabled(true);
        properties.setEnv(0);
        service = new VirtualPriceChangeService(changeDao, vipPackageDao, coinPackageDao, goodsGateway, properties);
    }

    @Test
    void requestingDifferentPriceQueuesNewProductWithoutChangingActivePackage() {
        service.requestChange("coin", 10L, "coin_10", new BigDecimal("125.36"));

        ArgumentCaptor<VirtualPriceChange> captor = ArgumentCaptor.forClass(VirtualPriceChange.class);
        verify(changeDao).insert(captor.capture());
        VirtualPriceChange change = captor.getValue();
        assertThat(change.getStatus()).isEqualTo("QUEUED");
        assertThat(change.getTargetPrice()).isEqualByComparingTo("125.36");
        assertThat(change.getNewProductId()).hasSizeLessThanOrEqualTo(20).isNotEqualTo("coin_10");
        verify(coinPackageDao, never()).updateById(any());
    }

    @Test
    void requestingNewPriceSupersedesEarlierUnfinishedChange() {
        VirtualPriceChange old = new VirtualPriceChange();
        old.setId(2L);
        old.setStatus("WAIT_EFFECTIVE");
        old.setTargetPrice(new BigDecimal("120.00"));
        when(changeDao.selectLatest("vip", 7L)).thenReturn(old);

        service.requestChange("vip", 7L, "vip_7", new BigDecimal("130.00"));

        assertThat(old.getStatus()).isEqualTo("SUPERSEDED");
        verify(changeDao).updateById(old);
        verify(changeDao).insert(any());
        verify(vipPackageDao, never()).updateById(any());
    }

    @Test
    void cancelledQueuedPriceNeverTouchesCurrentPackage() {
        VirtualPriceChange old = change("coin", 10L, "coin_10", "c10_new", "125.36", "QUEUED");
        when(changeDao.selectLatest("coin", 10L)).thenReturn(old);

        service.cancelChange("coin", 10L);

        assertThat(old.getStatus()).isEqualTo("CANCELLED");
        verify(changeDao).updateById(old);
        verify(coinPackageDao, never()).updateById(any());
    }

    @Test
    void successfulUploadOnlyStartsPublishAndDoesNotActivatePrice() {
        VirtualPriceChange change = change("vip", 7L, "vip_7", "v7_new", "12.34", "UPLOADING");
        when(changeDao.selectPending(1)).thenReturn(List.of(change));
        when(goodsGateway.queryUpload("v7_new")).thenReturn(new VirtualGoodsGateway.GoodsTaskSnapshot(
                VirtualGoodsGateway.TaskState.SUCCEEDED, VirtualGoodsGateway.ItemState.SUCCEEDED,
                "v7_new", 1234, null));

        service.advanceOne();

        assertThat(change.getStatus()).isEqualTo("PUBLISHING");
        verify(goodsGateway).publish("v7_new");
        verify(vipPackageDao, never()).updateById(any());
    }

    @Test
    void publishedGoodWaitsBeforeSwitchingActivePriceAndId() {
        VirtualPriceChange change = change("coin", 10L, "coin_10", "c10_new", "125.36", "WAIT_EFFECTIVE");
        change.setPublishedAt(LocalDateTime.now().minusMinutes(5));
        when(changeDao.selectPending(1)).thenReturn(List.of(change));

        service.advanceOne();

        verify(coinPackageDao, never()).updateById(any());
        assertThat(change.getStatus()).isEqualTo("WAIT_EFFECTIVE");
    }

    @Test
    void switchChangesPriceAndProductIdTogetherAfterGracePeriod() {
        VirtualPriceChange change = change("coin", 10L, "coin_10", "c10_new", "125.36", "WAIT_EFFECTIVE");
        change.setPublishedAt(LocalDateTime.now().minusMinutes(21));
        CoinPackage packageEntity = new CoinPackage();
        packageEntity.setId(10L);
        packageEntity.setWechatProductId("coin_10");
        packageEntity.setAmount(new BigDecimal("99.00"));
        packageEntity.setDiscountAmount(new BigDecimal("99.00"));
        when(changeDao.selectPending(1)).thenReturn(List.of(change));
        when(changeDao.selectLatest("coin", 10L)).thenReturn(change);
        when(coinPackageDao.selectById(10L)).thenReturn(packageEntity);

        service.advanceOne();

        assertThat(packageEntity.getWechatProductId()).isEqualTo("c10_new");
        assertThat(packageEntity.getDiscountAmount()).isEqualByComparingTo("125.36");
        assertThat(change.getStatus()).isEqualTo("ACTIVE");
        verify(coinPackageDao).updateById(packageEntity);
    }

    @Test
    void replacedGoodNeverActivatesEvenAfterGracePeriod() {
        VirtualPriceChange old = change("vip", 7L, "vip_7", "v7_old", "12.34", "WAIT_EFFECTIVE");
        old.setPublishedAt(LocalDateTime.now().minusMinutes(21));
        VirtualPriceChange newer = change("vip", 7L, "vip_7", "v7_new", "15.00", "QUEUED");
        newer.setId(3L);
        when(changeDao.selectPending(1)).thenReturn(List.of(old));
        when(changeDao.selectLatest("vip", 7L)).thenReturn(newer);

        service.advanceOne();

        verify(vipPackageDao, never()).updateById(any());
    }

    private VirtualPriceChange change(String type, Long packageId, String oldId,
                                      String newId, String price, String status) {
        VirtualPriceChange change = new VirtualPriceChange();
        change.setId(2L);
        change.setPackageType(type);
        change.setPackageId(packageId);
        change.setOldProductId(oldId);
        change.setNewProductId(newId);
        change.setTargetPrice(new BigDecimal(price));
        change.setStatus(status);
        return change;
    }
}
