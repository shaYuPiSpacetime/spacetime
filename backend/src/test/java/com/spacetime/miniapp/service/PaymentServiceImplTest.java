package com.spacetime.miniapp.service;

import com.spacetime.common.dao.*;
import com.spacetime.common.config.WechatPayProperties;
import com.spacetime.common.entity.*;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.miniapp.dto.request.CreateOrderReq;
import com.spacetime.miniapp.dto.request.UnlockReq;
import com.spacetime.miniapp.dto.response.*;
import com.spacetime.miniapp.service.impl.AssetServiceImpl;
import com.spacetime.miniapp.service.impl.PaymentServiceImpl;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
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
    @Mock private AppUserDao appUserDao;
    @Mock private PaymentNotifyLogDao paymentNotifyLogDao;
    @Mock private WechatPayService wechatPayService;
    private final WechatPayProperties wechatPayProperties = new WechatPayProperties();
    private PaymentServiceImpl paymentService;

    private VipPackage vipPackage;
    private CoinPackage coinPackage;
    private TradeOrder unpaidOrder;
    private UserAsset userAsset;
    private AppUser appUser;
    private WechatPayParamsVO payParams;

    @BeforeEach
    void setUp() {
        wechatPayProperties.setTestAmount(null);
        paymentService = new PaymentServiceImpl(
                vipPackageDao,
                coinPackageDao,
                tradeOrderDao,
                userAssetDao,
                userCoinLogDao,
                appUserDao,
                paymentNotifyLogDao,
                wechatPayService,
                wechatPayProperties
        );
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

        appUser = new AppUser();
        appUser.setId(1L);
        appUser.setOpenid("openid_1");

        payParams = new WechatPayParamsVO();
        payParams.setTimeStamp("1770000000");
        payParams.setNonceStr("nonce");
        payParams.setPackageValue("prepay_id=wx_pre_1");
        payParams.setSignType("RSA");
        payParams.setPaySign("sign");
        payParams.setPrepayId("wx_pre_1");
    }

    @Test
    @DisplayName("创建VIP订单-正常")
    void createVipOrder_shouldSucceed() {
        CreateOrderReq req = new CreateOrderReq();
        req.setOrderType("vip");
        req.setPackageId(1L);

        when(vipPackageDao.selectById(1L)).thenReturn(vipPackage);
        when(appUserDao.selectById(1L)).thenReturn(appUser);
        when(wechatPayService.createJsapiPayParams(any(TradeOrder.class), eq("openid_1"), eq(new BigDecimal("19.90")))).thenReturn(payParams);

        CreateOrderVO result = paymentService.createOrder(1L, req);

        assertThat(result.getOrderNo()).isNotNull();
        assertThat(result.getPayChannel()).isEqualTo("wechat");
        assertThat(result.getPayParams()).isEqualTo(payParams);
        verify(tradeOrderDao).insert(argThat(o -> "unpaid".equals(o.getOrderStatus())));
        verify(tradeOrderDao).updateById(argThat(o -> "wx_pre_1".equals(o.getPrepayId())));
    }

    @Test
    @DisplayName("测试环境创建VIP订单-仅微信扣款金额为0.01元，订单展示金额保持原价")
    void createVipOrder_testAmountShouldOnlyApplyToWechatPayment() {
        CreateOrderReq req = new CreateOrderReq();
        req.setOrderType("vip");
        req.setPackageId(1L);

        when(vipPackageDao.selectById(1L)).thenReturn(vipPackage);
        when(appUserDao.selectById(1L)).thenReturn(appUser);
        wechatPayProperties.setTestAmount(new BigDecimal("0.01"));
        when(wechatPayService.createJsapiPayParams(any(TradeOrder.class), eq("openid_1"), any(BigDecimal.class)))
                .thenReturn(payParams);

        CreateOrderVO result = paymentService.createOrder(1L, req);

        assertThat(result.getPayAmount()).isEqualByComparingTo("19.90");
        verify(tradeOrderDao).insert(argThat(order -> order.getPayAmount().compareTo(new BigDecimal("19.90")) == 0));
        verify(wechatPayService).createJsapiPayParams(any(TradeOrder.class), eq("openid_1"), eq(new BigDecimal("0.01")));
    }

    @Test
    @DisplayName("测试环境创建千寻币订单-仅微信扣款金额为0.01元，订单展示金额保持原价")
    void createCoinOrder_testAmountShouldOnlyApplyToWechatPayment() {
        CreateOrderReq req = new CreateOrderReq();
        req.setOrderType("coin");
        req.setPackageId(2L);

        when(coinPackageDao.selectById(2L)).thenReturn(coinPackage);
        when(appUserDao.selectById(1L)).thenReturn(appUser);
        wechatPayProperties.setTestAmount(new BigDecimal("0.01"));
        when(wechatPayService.createJsapiPayParams(any(TradeOrder.class), eq("openid_1"), any(BigDecimal.class)))
                .thenReturn(payParams);

        CreateOrderVO result = paymentService.createOrder(1L, req);

        assertThat(result.getPayAmount()).isEqualByComparingTo("6.00");
        verify(tradeOrderDao).insert(argThat(order -> order.getPayAmount().compareTo(new BigDecimal("6.00")) == 0));
        verify(wechatPayService).createJsapiPayParams(any(TradeOrder.class), eq("openid_1"), eq(new BigDecimal("0.01")));
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
    @DisplayName("查询支付结果-超过30分钟未支付自动关闭")
    void getOrderResult_expiredUnpaid_shouldCloseWithoutWechatQuery() {
        unpaidOrder.setExpireTime(LocalDateTime.now().minusMinutes(1));
        when(tradeOrderDao.selectById(100L)).thenReturn(unpaidOrder);
        when(userAssetDao.selectByUserId(1L)).thenReturn(userAsset);

        PayResultVO result = paymentService.getOrderResult(1L, 100L);

        assertThat(result.getOrderStatus()).isEqualTo("closed");
        verify(tradeOrderDao).updateById(argThat(order -> "closed".equals(order.getOrderStatus())));
        verifyNoInteractions(wechatPayService);
        verify(userAssetDao, never()).updateById(any());
    }

    @Test
    @DisplayName("微信支付确认千寻币-含赠送币")
    void confirmWechatPayCoin_shouldAddCoinWithBonus() {
        unpaidOrder.setOrderType("coin");
        unpaidOrder.setPackageId(2L);
        unpaidOrder.setPayAmount(new BigDecimal("6.00"));

        when(tradeOrderDao.selectById(100L)).thenReturn(unpaidOrder);
        when(wechatPayService.queryOrder("VIP202605280001"))
                .thenReturn(new WechatPayService.WechatPayNotifyResult(
                        "VIP202605280001",
                        "420000000120260709000001",
                        "SUCCESS",
                        "{\"trade_state\":\"SUCCESS\"}"
                ));
        when(coinPackageDao.selectById(2L)).thenReturn(coinPackage);
        when(userAssetDao.selectByUserId(1L)).thenReturn(userAsset);
        when(userAssetDao.updateCoinBalance(1L, 70)).thenReturn(1);

        PayResultVO result = paymentService.confirmWechatPay(1L, 100L);

        assertThat(result.getOrderStatus()).isEqualTo("success");
        assertThat(result.getCoinBalance()).isNotNull();
        // 验证真实支付确认后写入充值流水（充值70币=60+10赠送）
        verify(userCoinLogDao).insert(argThat(log ->
                "recharge".equals(log.getFlowType()) && log.getChangeAmount() == 70));
    }

    @Test
    @DisplayName("微信支付确认-查单成功后入账会员")
    void confirmWechatPay_successQuery_shouldUpdateAssetAndOrder() {
        when(tradeOrderDao.selectById(100L)).thenReturn(unpaidOrder);
        when(wechatPayService.queryOrder("VIP202605280001"))
                .thenReturn(new WechatPayService.WechatPayNotifyResult(
                        "VIP202605280001",
                        "420000000120260709000001",
                        "SUCCESS",
                        "{\"trade_state\":\"SUCCESS\"}"
                ));
        when(vipPackageDao.selectById(1L)).thenReturn(vipPackage);
        when(userAssetDao.selectByUserId(1L)).thenReturn(userAsset);

        PayResultVO result = paymentService.confirmWechatPay(1L, 100L);

        assertThat(result.getOrderStatus()).isEqualTo("success");
        verify(tradeOrderDao).updateById(argThat(o ->
                "success".equals(o.getOrderStatus())
                        && "wechat".equals(o.getPayChannel())
                        && "420000000120260709000001".equals(o.getChannelTradeNo())
                        && o.getSuccessTime() != null));
        verify(userAssetDao).updateById(argThat(a ->
                "active".equals(a.getVipStatus()) && a.getVipExpireTime() != null));
        verify(paymentNotifyLogDao).insert(argThat(log ->
                "payment_confirm".equals(log.getNotifyType())
                        && "success".equals(log.getProcessStatus())));
    }

    @Test
    @DisplayName("微信支付确认-未支付状态不入账")
    void confirmWechatPay_notPaid_shouldKeepUnpaid() {
        when(tradeOrderDao.selectById(100L)).thenReturn(unpaidOrder);
        when(wechatPayService.queryOrder("VIP202605280001"))
                .thenReturn(new WechatPayService.WechatPayNotifyResult(
                        "VIP202605280001",
                        "",
                        "NOTPAY",
                        "{\"trade_state\":\"NOTPAY\"}"
                ));

        PayResultVO result = paymentService.confirmWechatPay(1L, 100L);

        assertThat(result.getOrderStatus()).isEqualTo("unpaid");
        verify(userAssetDao, never()).updateById(any());
        verify(paymentNotifyLogDao).insert(argThat(log ->
                "payment_confirm".equals(log.getNotifyType())
                        && "ignored".equals(log.getProcessStatus())));
    }

}

@ExtendWith(MockitoExtension.class)
@DisplayName("PRD-04 AssetService L3 测试")
class AssetServiceImplTest {

    @Mock private UserAssetDao userAssetDao;
    @Mock private UserCoinLogDao userCoinLogDao;
    @Mock private UserUnlockRecordDao userUnlockRecordDao;
    @Mock private CoinSceneConfigDao coinSceneConfigDao;
    @InjectMocks private AssetServiceImpl assetService;

    private UserAsset userAsset;
    private CoinSceneConfig sceneConfig;

    @BeforeEach
    void setUp() {
        userAsset = new UserAsset();
        userAsset.setId(1L);
        userAsset.setUserId(1L);
        userAsset.setVipStatus("inactive");
        userAsset.setCoinBalance(100);
        userAsset.setTodayFreeWhisperRemain(1);
        userAsset.setTotalRecharge(BigDecimal.ZERO);
        sceneConfig = new CoinSceneConfig();
        sceneConfig.setSceneCode("ideal_user");
        sceneConfig.setUnitPrice(10);
        sceneConfig.setRetentionDays(90);
        sceneConfig.setStatus("ENABLED");
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
        stubEnabledScene();
        stubSuccessfulBalanceUpdate();

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
        stubEnabledScene();
        stubSuccessfulBalanceUpdate();

        UnlockVO result = assetService.unlock(1L, req);

        assertThat(result.getUnlockedCount()).isEqualTo(5);
    }

    @Test
    @DisplayName("批量解锁-超过5个上限")
    void unlock_batch6_shouldThrow() {
        UnlockReq req = new UnlockReq();
        req.setUnlockScene("ideal_user");
        req.setTargetUserIds(List.of(101L, 102L, 103L, 104L, 105L, 106L));
        stubEnabledScene();

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
        stubEnabledScene();

        assertThatThrownBy(() -> assetService.unlock(1L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("余额不足");
        verify(userUnlockRecordDao, never()).insert(any());
    }

    @Test
    @DisplayName("喜欢和访客单条解锁不得绕过两步确认接口")
    void unlock_relationScene_shouldRequireQuoteAndConfirm() {
        UnlockReq req = new UnlockReq();
        req.setUnlockScene("likes_unlock_one");
        req.setTargetUserIds(List.of(101L));

        assertThatThrownBy(() -> assetService.unlock(1L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("两步解锁");
        verify(userAssetDao, never()).updateCoinBalance(anyLong(), anyInt());
    }

    private void stubEnabledScene() {
        when(coinSceneConfigDao.selectPage(any(Page.class), any())).thenAnswer(invocation -> {
            Page<CoinSceneConfig> page = invocation.getArgument(0);
            page.setRecords(List.of(sceneConfig));
            page.setTotal(1);
            return page;
        });
    }

    private void stubSuccessfulBalanceUpdate() {
        when(userAssetDao.updateCoinBalance(anyLong(), anyInt())).thenReturn(1);
        when(userAssetDao.updateLastConsumeTime(anyLong(), any(LocalDateTime.class))).thenReturn(1);
    }
}
