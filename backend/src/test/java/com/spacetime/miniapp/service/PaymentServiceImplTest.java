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
import com.spacetime.common.service.PromotionEventInboxService;
import com.spacetime.common.service.AssetResultMessageNotificationService;
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
    @Mock private WechatVirtualPayService wechatVirtualPayService;
    @Mock private WechatMiniappClient wechatMiniappClient;
    @Mock private PromotionEventInboxService promotionEventInboxService;
    @Mock private AssetResultMessageNotificationService assetResultNotificationService;
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
                wechatVirtualPayService,
                wechatMiniappClient,
                wechatPayProperties,
                promotionEventInboxService,
                assetResultNotificationService
        );
        lenient().when(wechatVirtualPayService.isEnabled()).thenReturn(false);
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
    @DisplayName("创建VIP虚拟支付订单-刷新微信会话并返回道具直购参数")
    void createVipOrderWithVirtualPayShouldVerifyWechatSession() {
        CreateOrderReq req = new CreateOrderReq();
        req.setOrderType("vip");
        req.setPackageId(1L);
        req.setLoginCode("fresh-code");
        WechatVirtualPayParamsVO virtualParams = new WechatVirtualPayParamsVO();
        virtualParams.setSignData("{\"offerId\":\"offer-1\"}");
        virtualParams.setPaySig("pay-sig");
        virtualParams.setSignature("user-sig");

        when(wechatVirtualPayService.isEnabled()).thenReturn(true);
        when(vipPackageDao.selectById(1L)).thenReturn(vipPackage);
        when(appUserDao.selectById(1L)).thenReturn(appUser);
        when(wechatMiniappClient.code2Session("fresh-code"))
                .thenReturn(new WechatMiniappClient.SessionInfo(
                        "openid_1", null, "session-key"));
        when(wechatVirtualPayService.createPayParams(
                anyString(), eq("vip_1"), eq(1990), eq("session-key")))
                .thenReturn(virtualParams);

        CreateOrderVO result = paymentService.createOrder(1L, req);

        assertThat(result.getPaymentMode()).isEqualTo("wechat_virtual");
        assertThat(result.getVirtualPayParams()).isSameAs(virtualParams);
        assertThat(result.getPayParams()).isNull();
        verify(tradeOrderDao).insert(argThat(order ->
                "wechat_virtual".equals(order.getPayChannel())));
        verifyNoInteractions(wechatPayService);
    }

    @Test
    @DisplayName("创建虚拟支付订单-微信会话与当前账号不一致时拒绝")
    void createVirtualOrderShouldRejectMismatchedOpenid() {
        CreateOrderReq req = new CreateOrderReq();
        req.setOrderType("vip");
        req.setPackageId(1L);
        req.setLoginCode("fresh-code");

        when(wechatVirtualPayService.isEnabled()).thenReturn(true);
        when(vipPackageDao.selectById(1L)).thenReturn(vipPackage);
        when(appUserDao.selectById(1L)).thenReturn(appUser);
        when(wechatMiniappClient.code2Session("fresh-code"))
                .thenReturn(new WechatMiniappClient.SessionInfo(
                        "another-openid", null, "session-key"));

        assertThatThrownBy(() -> paymentService.createOrder(1L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("身份");
        verify(tradeOrderDao, never()).insert(any());
        verifyNoInteractions(wechatPayService);
    }

    @Test
    @DisplayName("手机号账号首次支付-使用本次微信会话绑定真实 openid")
    void createVirtualOrderShouldBindWechatIdentityForPhoneAccount() {
        appUser.setOpenid("phone_17300000000");
        CreateOrderReq req = new CreateOrderReq();
        req.setOrderType("vip");
        req.setPackageId(1L);
        req.setLoginCode("fresh-code");
        WechatVirtualPayParamsVO virtualParams = new WechatVirtualPayParamsVO();

        when(wechatVirtualPayService.isEnabled()).thenReturn(true);
        when(vipPackageDao.selectById(1L)).thenReturn(vipPackage);
        when(appUserDao.selectById(1L)).thenReturn(appUser);
        when(wechatMiniappClient.code2Session("fresh-code"))
                .thenReturn(new WechatMiniappClient.SessionInfo(
                        "openid_real", "unionid_real", "session-key"));
        when(appUserDao.selectOne(any())).thenReturn(null);
        when(wechatVirtualPayService.createPayParams(
                anyString(), eq("vip_1"), eq(1990), eq("session-key")))
                .thenReturn(virtualParams);

        CreateOrderVO result = paymentService.createOrder(1L, req);

        assertThat(result.getPaymentMode()).isEqualTo("wechat_virtual");
        verify(appUserDao).updateById(argThat(user ->
                "openid_real".equals(user.getOpenid())
                        && "unionid_real".equals(user.getUnionid())));
        verify(tradeOrderDao).insert(any());
    }

    @Test
    @DisplayName("手机号账号首次支付-当前微信已绑定其他账号时拒绝覆盖")
    void createVirtualOrderShouldRejectWechatIdentityOwnedByAnotherAccount() {
        appUser.setOpenid("phone_17300000000");
        AppUser existingWechatUser = new AppUser();
        existingWechatUser.setId(2L);
        existingWechatUser.setOpenid("openid_real");
        CreateOrderReq req = new CreateOrderReq();
        req.setOrderType("vip");
        req.setPackageId(1L);
        req.setLoginCode("fresh-code");

        when(wechatVirtualPayService.isEnabled()).thenReturn(true);
        when(vipPackageDao.selectById(1L)).thenReturn(vipPackage);
        when(appUserDao.selectById(1L)).thenReturn(appUser);
        when(wechatMiniappClient.code2Session("fresh-code"))
                .thenReturn(new WechatMiniappClient.SessionInfo(
                        "openid_real", null, "session-key"));
        when(appUserDao.selectOne(any())).thenReturn(existingWechatUser);

        assertThatThrownBy(() -> paymentService.createOrder(1L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("其他账号");
        verify(appUserDao, never()).updateById(any());
        verify(tradeOrderDao, never()).insert(any());
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
    @DisplayName("部署环境强制测试金额-VIP微信扣款0.01元且订单保持原价")
    void createVipOrder_forceTestAmountShouldUseConfiguredTestPayAmount() {
        CreateOrderReq req = new CreateOrderReq();
        req.setOrderType("vip");
        req.setPackageId(1L);

        wechatPayProperties.setForceTestAmount(true);
        wechatPayProperties.setTestPayAmount(new BigDecimal("0.01"));
        when(vipPackageDao.selectById(1L)).thenReturn(vipPackage);
        when(appUserDao.selectById(1L)).thenReturn(appUser);
        when(wechatPayService.createJsapiPayParams(any(TradeOrder.class), eq("openid_1"), eq(new BigDecimal("0.01"))))
                .thenReturn(payParams);

        CreateOrderVO result = paymentService.createOrder(1L, req);

        assertThat(result.getPayAmount()).isEqualByComparingTo("19.90");
        verify(tradeOrderDao).insert(argThat(order -> new BigDecimal("19.90").compareTo(order.getPayAmount()) == 0));
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

        when(tradeOrderDao.selectByIdForUpdate(100L)).thenReturn(unpaidOrder);
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
        verify(assetResultNotificationService).publishOrderAfterCommit(
                eq(unpaidOrder), any(LocalDateTime.class));
    }

    @Test
    @DisplayName("微信支付确认-查单成功后入账会员")
    void confirmWechatPay_successQuery_shouldUpdateAssetAndOrder() {
        when(tradeOrderDao.selectByIdForUpdate(100L)).thenReturn(unpaidOrder);
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
        when(tradeOrderDao.selectByIdForUpdate(100L)).thenReturn(unpaidOrder);
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

    @Test
    @DisplayName("虚拟支付确认-已支付待发货时仅入账一次并通知发货")
    void confirmVirtualPayPaidShouldSettleAndNotifyGoods() {
        unpaidOrder.setPayChannel("wechat_virtual");
        when(tradeOrderDao.selectByIdForUpdate(100L)).thenReturn(unpaidOrder);
        when(appUserDao.selectById(1L)).thenReturn(appUser);
        when(wechatVirtualPayService.queryOrder("openid_1", "VIP202605280001"))
                .thenReturn(new WechatVirtualPayService.VirtualPayOrderResult(
                        "VIP202605280001",
                        "wx-order-1",
                        "wxpay-transaction-1",
                        2,
                        1770000000L,
                        "{\"order\":{\"status\":2}}"
                ));
        when(vipPackageDao.selectById(1L)).thenReturn(vipPackage);
        when(userAssetDao.selectByUserId(1L)).thenReturn(userAsset);

        PayResultVO result = paymentService.confirmWechatPay(1L, 100L);

        assertThat(result.getOrderStatus()).isEqualTo("success");
        verify(tradeOrderDao).updateById(argThat(order ->
                "success".equals(order.getOrderStatus())
                        && "wxpay-transaction-1".equals(order.getChannelTradeNo())));
        verify(wechatVirtualPayService).notifyProvideGoods(
                "VIP202605280001", "wx-order-1");
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
        sceneConfig.setSceneCode("compatible_person_unlock_one");
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
    @DisplayName("兼容对象单条解锁-余额充足")
    void unlock_single_shouldDeductCoin() {
        UnlockReq req = new UnlockReq();
        req.setUnlockScene("featured_profile");
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
    @DisplayName("兼容对象批量解锁-5个")
    void unlock_batch5_shouldSucceed() {
        userAsset.setCoinBalance(500);
        UnlockReq req = new UnlockReq();
        req.setUnlockScene("featured_profile");
        req.setTargetUserIds(List.of(101L, 102L, 103L, 104L, 105L));

        when(userAssetDao.selectByUserId(1L)).thenReturn(userAsset);
        stubEnabledScene();
        stubSuccessfulBalanceUpdate();

        UnlockVO result = assetService.unlock(1L, req);

        assertThat(result.getUnlockedCount()).isEqualTo(5);
    }

    @Test
    @DisplayName("理想型旧接口不得绕过报价、折扣和快照校验")
    void unlock_idealScene_shouldRequireDedicatedQuoteAndConfirm() {
        UnlockReq req = new UnlockReq();
        req.setUnlockScene("ideal_user");
        req.setTargetUserIds(List.of(101L, 102L, 103L, 104L, 105L, 106L));

        assertThatThrownBy(() -> assetService.unlock(1L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("理想型")
                .hasMessageContaining("报价");
        verify(userAssetDao, never()).updateCoinBalance(anyLong(), anyInt());
    }

    @Test
    @DisplayName("解锁-余额不足")
    void unlock_insufficientBalance_shouldThrow() {
        userAsset.setCoinBalance(5);
        UnlockReq req = new UnlockReq();
        req.setUnlockScene("featured_profile");
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
