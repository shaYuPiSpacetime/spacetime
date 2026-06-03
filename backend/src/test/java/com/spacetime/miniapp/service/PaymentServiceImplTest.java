package com.spacetime.miniapp.service;

import com.spacetime.common.dao.*;
import com.spacetime.common.entity.*;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.miniapp.dto.request.CreateOrderReq;
import com.spacetime.miniapp.dto.request.UnlockReq;
import com.spacetime.miniapp.dto.response.*;
import com.spacetime.miniapp.service.impl.AssetServiceImpl;
import com.spacetime.miniapp.service.impl.PaymentServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PRD-04 PaymentService L3 测试")
class PaymentServiceImplTest {

    @Mock private VipPackageDao vipPackageDao;
    @Mock private CoinPackageDao coinPackageDao;
    @Mock private TradeOrderDao tradeOrderDao;
    @Mock private UserAssetDao userAssetDao;
    @Mock private UserCoinLogDao userCoinLogDao;
    @InjectMocks private PaymentServiceImpl paymentService;

    private VipPackage vipPackage;
    private CoinPackage coinPackage;
    private TradeOrder unpaidOrder;
    private UserAsset userAsset;

    @BeforeEach
    void setUp() {
        vipPackage = new VipPackage();
        vipPackage.setId(1L);
        vipPackage.setPackageName("月卡");
        vipPackage.setPackageType("normal");
        vipPackage.setPrice(new BigDecimal("19.90"));
        vipPackage.setDurationDays(30);
        vipPackage.setStatus("ENABLED");

        coinPackage = new CoinPackage();
        coinPackage.setId(2L);
        coinPackage.setPackageName("6元套餐");
        coinPackage.setAmount(new BigDecimal("6.00"));
        coinPackage.setCoinCount(60);
        coinPackage.setBonusCoinCount(10);
        coinPackage.setStatus("ENABLED");

        unpaidOrder = new TradeOrder();
        unpaidOrder.setId(100L);
        unpaidOrder.setOrderNo("VIP202605280001");
        unpaidOrder.setUserId(1L);
        unpaidOrder.setOrderType("vip");
        unpaidOrder.setPackageId(1L);
        unpaidOrder.setPackageName("月卡");
        unpaidOrder.setPayAmount(new BigDecimal("19.90"));
        unpaidOrder.setOrderStatus("unpaid");

        userAsset = new UserAsset();
        userAsset.setId(1L);
        userAsset.setUserId(1L);
        userAsset.setVipStatus("inactive");
        userAsset.setCoinBalance(100);
        userAsset.setTotalRecharge(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("创建VIP订单-正常")
    void createVipOrder_shouldSucceed() {
        CreateOrderReq req = new CreateOrderReq();
        req.setOrderType("vip");
        req.setPackageId(1L);

        when(vipPackageDao.selectById(1L)).thenReturn(vipPackage);

        CreateOrderVO result = paymentService.createOrder(1L, req);

        assertThat(result.getOrderNo()).isNotNull();
        verify(tradeOrderDao).insert(argThat(o -> "unpaid".equals(o.getOrderStatus())));
    }

    @Test
    @DisplayName("创建订单-套餐不存在")
    void createOrder_packageNotFound_shouldThrow() {
        CreateOrderReq req = new CreateOrderReq();
        req.setOrderType("vip");
        req.setPackageId(999L);

        when(vipPackageDao.selectById(999L)).thenReturn(null);

        assertThatThrownBy(() -> paymentService.createOrder(1L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("套餐不存在");
    }

    @Test
    @DisplayName("创建订单-套餐已停用")
    void createOrder_packageDisabled_shouldThrow() {
        vipPackage.setStatus("DISABLED");
        CreateOrderReq req = new CreateOrderReq();
        req.setOrderType("vip");
        req.setPackageId(1L);

        when(vipPackageDao.selectById(1L)).thenReturn(vipPackage);

        assertThatThrownBy(() -> paymentService.createOrder(1L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("已下架");
    }

    @Test
    @DisplayName("模拟支付VIP-正常流程")
    void mockPayVip_shouldUpdateAssetAndOrder() {
        when(tradeOrderDao.selectById(100L)).thenReturn(unpaidOrder);
        when(vipPackageDao.selectById(1L)).thenReturn(vipPackage);
        when(userAssetDao.selectByUserId(1L)).thenReturn(userAsset);

        PayResultVO result = paymentService.mockPay(1L, 100L);

        assertThat(result.getOrderStatus()).isEqualTo("success");
        verify(tradeOrderDao).updateById(argThat(o ->
                "success".equals(o.getOrderStatus()) && o.getSuccessTime() != null));
        verify(userAssetDao).updateById(argThat(a ->
                "active".equals(a.getVipStatus()) && a.getVipExpireTime() != null));
    }

    @Test
    @DisplayName("模拟支付成家币-含赠送币")
    void mockPayCoin_shouldAddCoinWithBonus() {
        unpaidOrder.setOrderType("coin");
        unpaidOrder.setPackageId(2L);
        unpaidOrder.setPayAmount(new BigDecimal("6.00"));

        when(tradeOrderDao.selectById(100L)).thenReturn(unpaidOrder);
        when(coinPackageDao.selectById(2L)).thenReturn(coinPackage);
        when(userAssetDao.selectByUserId(1L)).thenReturn(userAsset);

        PayResultVO result = paymentService.mockPay(1L, 100L);

        assertThat(result.getOrderStatus()).isEqualTo("success");
        assertThat(result.getCoinBalance()).isNotNull();
        // 验证写入了流水（充值70币=60+10赠送）
        verify(userCoinLogDao).insert(argThat(log ->
                "recharge".equals(log.getFlowType()) && log.getChangeAmount() == 70));
    }

    @Test
    @DisplayName("模拟支付-幂等处理")
    void mockPay_alreadySuccess_shouldReturnDirectly() {
        unpaidOrder.setOrderStatus("success");
        unpaidOrder.setSuccessTime(LocalDateTime.now());
        when(tradeOrderDao.selectById(100L)).thenReturn(unpaidOrder);

        PayResultVO result = paymentService.mockPay(1L, 100L);

        assertThat(result.getOrderStatus()).isEqualTo("success");
        verify(tradeOrderDao, never()).updateById(any());
    }

    @Test
    @DisplayName("模拟支付-订单已关闭")
    void mockPay_closedOrder_shouldThrow() {
        unpaidOrder.setOrderStatus("closed");
        when(tradeOrderDao.selectById(100L)).thenReturn(unpaidOrder);

        assertThatThrownBy(() -> paymentService.mockPay(1L, 100L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("无法支付");
    }
}

@ExtendWith(MockitoExtension.class)
@DisplayName("PRD-04 AssetService L3 测试")
class AssetServiceImplTest {

    @Mock private UserAssetDao userAssetDao;
    @Mock private UserCoinLogDao userCoinLogDao;
    @Mock private UserUnlockRecordDao userUnlockRecordDao;
    @InjectMocks private AssetServiceImpl assetService;

    private UserAsset userAsset;

    @BeforeEach
    void setUp() {
        userAsset = new UserAsset();
        userAsset.setId(1L);
        userAsset.setUserId(1L);
        userAsset.setVipStatus("inactive");
        userAsset.setCoinBalance(100);
        userAsset.setTodayFreeWhisperRemain(1);
        userAsset.setTotalRecharge(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("查询资产摘要-正常")
    void getSummary_shouldReturnCorrectData() {
        when(userAssetDao.selectByUserId(1L)).thenReturn(userAsset);

        AssetSummaryVO result = assetService.getSummary(1L);

        assertThat(result.getVipStatus()).isEqualTo("inactive");
        assertThat(result.getCoinBalance()).isEqualTo(100);
        assertThat(result.getTodayFreeWhisperRemain()).isEqualTo(1);
    }

    @Test
    @DisplayName("单条解锁-余额充足")
    void unlock_single_shouldDeductCoin() {
        UnlockReq req = new UnlockReq();
        req.setUnlockScene("ideal_user");
        req.setTargetUserIds(List.of(101L));

        when(userAssetDao.selectByUserId(1L)).thenReturn(userAsset);

        UnlockVO result = assetService.unlock(1L, req);

        assertThat(result.getUnlockedCount()).isEqualTo(1);
        verify(userCoinLogDao).insert(argThat(log ->
                "consume".equals(log.getFlowType()) && log.getChangeAmount() < 0));
    }

    @Test
    @DisplayName("批量解锁理想型-5个")
    void unlock_batch5_shouldSucceed() {
        userAsset.setCoinBalance(500);
        UnlockReq req = new UnlockReq();
        req.setUnlockScene("ideal_user");
        req.setTargetUserIds(List.of(101L, 102L, 103L, 104L, 105L));

        when(userAssetDao.selectByUserId(1L)).thenReturn(userAsset);

        UnlockVO result = assetService.unlock(1L, req);

        assertThat(result.getUnlockedCount()).isEqualTo(5);
    }

    @Test
    @DisplayName("批量解锁-超过5个上限")
    void unlock_batch6_shouldThrow() {
        UnlockReq req = new UnlockReq();
        req.setUnlockScene("ideal_user");
        req.setTargetUserIds(List.of(101L, 102L, 103L, 104L, 105L, 106L));

        assertThatThrownBy(() -> assetService.unlock(1L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("最多");
    }

    @Test
    @DisplayName("解锁-余额不足")
    void unlock_insufficientBalance_shouldThrow() {
        userAsset.setCoinBalance(5);
        UnlockReq req = new UnlockReq();
        req.setUnlockScene("ideal_user");
        req.setTargetUserIds(List.of(101L));

        when(userAssetDao.selectByUserId(1L)).thenReturn(userAsset);

        assertThatThrownBy(() -> assetService.unlock(1L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("余额不足");
        verify(userUnlockRecordDao, never()).insert(any());
    }
}
