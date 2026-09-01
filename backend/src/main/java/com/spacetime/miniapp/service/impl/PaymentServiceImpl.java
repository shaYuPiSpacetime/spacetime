package com.spacetime.miniapp.service.impl;

import cn.hutool.core.util.IdUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.CoinPackageDao;
import com.spacetime.common.dao.PaymentNotifyLogDao;
import com.spacetime.common.dao.TradeOrderDao;
import com.spacetime.common.dao.UserAssetDao;
import com.spacetime.common.dao.UserCoinLogDao;
import com.spacetime.common.dao.VipPackageDao;
import com.spacetime.common.config.WechatPayProperties;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.CoinPackage;
import com.spacetime.common.entity.PaymentNotifyLog;
import com.spacetime.common.entity.TradeOrder;
import com.spacetime.common.entity.UserAsset;
import com.spacetime.common.entity.UserCoinLog;
import com.spacetime.common.entity.VipPackage;
import com.spacetime.common.enums.BizSceneEnum;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.enums.FlowTypeEnum;
import com.spacetime.common.enums.OrderStatusEnum;
import com.spacetime.common.enums.OrderTypeEnum;
import com.spacetime.common.enums.VipStatusEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.AssetResultMessageNotificationService;
import com.spacetime.common.service.PromotionEventInboxService;
import com.spacetime.common.enums.PromotionRewardEventEnum;
import com.spacetime.miniapp.dto.request.CreateOrderReq;
import com.spacetime.miniapp.dto.response.CreateOrderVO;
import com.spacetime.miniapp.dto.response.PayResultVO;
import com.spacetime.miniapp.dto.response.WechatPayParamsVO;
import com.spacetime.miniapp.dto.response.WechatVirtualPayParamsVO;
import com.spacetime.miniapp.service.PaymentService;
import com.spacetime.miniapp.service.WechatMiniappClient;
import com.spacetime.miniapp.service.WechatPayService;
import com.spacetime.miniapp.service.WechatVirtualPayService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Objects;

/**
 * 小程序支付服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {

    /** VIP套餐数据访问 */
    private final VipPackageDao vipPackageDao;
    /** 千寻币套餐数据访问 */
    private final CoinPackageDao coinPackageDao;
    /** 交易订单数据访问 */
    private final TradeOrderDao tradeOrderDao;
    /** 用户资产数据访问 */
    private final UserAssetDao userAssetDao;
    /** 成家币流水数据访问 */
    private final UserCoinLogDao userCoinLogDao;
    /** 小程序用户数据访问 */
    private final AppUserDao appUserDao;
    /** 支付回调日志数据访问 */
    private final PaymentNotifyLogDao paymentNotifyLogDao;
    /** 微信支付服务 */
    private final WechatPayService wechatPayService;
    /** 微信小程序虚拟支付服务 */
    private final WechatVirtualPayService wechatVirtualPayService;
    /** 微信小程序开放接口客户端 */
    private final WechatMiniappClient wechatMiniappClient;
    /** 微信支付配置，用于测试环境覆盖网关扣款金额 */
    private final WechatPayProperties wechatPayProperties;
    /** 推广事实事件收件箱 */
    private final PromotionEventInboxService promotionEventInboxService;
    /** 资产结果系统消息适配器 */
    private final AssetResultMessageNotificationService assetResultNotificationService;

    /**
     * 创建支付订单（VIP套餐或成家币套餐购买）
     *
     * @param userId 用户ID
     * @param req    订单请求（订单类型、套餐ID）
     * @return 订单创建结果（订单ID、订单编号）
     */
    @Override
    @Transactional
    public CreateOrderVO createOrder(Long userId, CreateOrderReq req) {
        String orderType = req.getOrderType();
        Long packageId = req.getPackageId();
        log.info("创建订单: userId={}, orderType={}, packageId={}", userId, orderType, packageId);

        // 1. 根据订单类型校验套餐存在且已启用
        BigDecimal payAmount;
        String packageName;
        if (OrderTypeEnum.VIP.getCode().equals(orderType)) {
            VipPackage vipPkg = vipPackageDao.selectById(packageId);
            if (vipPkg == null || !CommonStatusEnum.ENABLED.getCode().equals(vipPkg.getStatus())) {
                throw new BusinessException("VIP 套餐不存在或已下架");
            }
            payAmount = vipPkg.getPrice();
            packageName = vipPkg.getPackageName();
        } else if (OrderTypeEnum.COIN.getCode().equals(orderType)) {
            CoinPackage coinPkg = coinPackageDao.selectById(packageId);
            if (coinPkg == null || !CommonStatusEnum.ENABLED.getCode().equals(coinPkg.getStatus())) {
                throw new BusinessException("千寻币套餐不存在或已下架");
            }
            payAmount = coinPkg.getAmount();
            packageName = coinPkg.getPackageName();
        } else {
            throw new BusinessException("不支持的订单类型");
        }
        AppUser user = appUserDao.selectById(userId);
        if (user == null) {
            throw new BusinessException("当前用户不存在，无法发起支付");
        }

        boolean virtualPayEnabled = wechatVirtualPayService.isEnabled();
        WechatMiniappClient.SessionInfo paymentSession = refreshPaymentWechatIdentity(
                user, req.getLoginCode(), virtualPayEnabled);
        if (user.getOpenid() == null || user.getOpenid().isBlank()
                || isPhonePlaceholderOpenid(user.getOpenid())) {
            throw new BusinessException("当前账号未绑定微信，请重新登录后支付");
        }

        // 2. 生成订单编号并写入订单
        String orderNo = "TO" + IdUtil.getSnowflakeNextIdStr();
        TradeOrder order = new TradeOrder();
        order.setOrderNo(orderNo);
        order.setUserId(userId);
        order.setOrderType(orderType);
        order.setPackageId(packageId);
        order.setPackageName(packageName);
        order.setPayAmount(payAmount);
        order.setPayChannel(virtualPayEnabled ? "wechat_virtual" : "wechat");
        order.setOrderStatus(OrderStatusEnum.UNPAID.getCode());
        order.setExpireTime(LocalDateTime.now().plusMinutes(30));
        tradeOrderDao.insert(order);

        // 3. 根据开关生成虚拟支付或普通微信支付参数
        WechatPayParamsVO payParams = null;
        WechatVirtualPayParamsVO virtualPayParams = null;
        if (virtualPayEnabled) {
            virtualPayParams = wechatVirtualPayService.createPayParams(
                    orderNo,
                    orderType + "_" + packageId,
                    toFen(payAmount),
                    paymentSession.sessionKey()
            );
        } else {
            payParams = wechatPayService.createJsapiPayParams(
                    order,
                    user.getOpenid(),
                    resolveWechatPaymentAmount(payAmount)
            );
            order.setPrepayId(payParams.getPrepayId());
            tradeOrderDao.updateById(order);
        }

        // 4. 返回创建结果
        CreateOrderVO vo = new CreateOrderVO();
        vo.setOrderId(order.getId());
        vo.setOrderNo(orderNo);
        vo.setPayAmount(payAmount);
        vo.setPayChannel(order.getPayChannel());
        vo.setPaymentMode(virtualPayEnabled ? "wechat_virtual" : "wechat_jsapi");
        vo.setPayParams(payParams);
        vo.setVirtualPayParams(virtualPayParams);
        return vo;
    }

    /** 将套餐金额转换为微信虚拟支付使用的分。 */
    private int toFen(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("套餐价格配置不正确，无法发起虚拟支付");
        }
        try {
            return amount.movePointRight(2).intValueExact();
        } catch (ArithmeticException ex) {
            throw new BusinessException("套餐价格配置不正确，无法发起虚拟支付");
        }
    }

    /**
     * 支付前刷新微信会话；纯手机号账号只允许首次绑定尚未被其他账号占用的微信身份。
     */
    private WechatMiniappClient.SessionInfo refreshPaymentWechatIdentity(
            AppUser user,
            String loginCode,
            boolean sessionRequired
    ) {
        if (loginCode == null || loginCode.isBlank()) {
            if (sessionRequired) {
                throw new BusinessException("微信登录状态已失效，请重新发起支付");
            }
            return null;
        }

        WechatMiniappClient.SessionInfo session = wechatMiniappClient.code2Session(loginCode);
        if (session == null || session.openid() == null || session.openid().isBlank()) {
            throw new BusinessException("微信登录状态已失效，请重新发起支付");
        }
        if (sessionRequired && (session.sessionKey() == null || session.sessionKey().isBlank())) {
            throw new BusinessException("微信登录状态已失效，请重新发起支付");
        }

        if (isPhonePlaceholderOpenid(user.getOpenid())) {
            bindWechatIdentity(user, session);
        } else if (!Objects.equals(user.getOpenid(), session.openid())) {
            throw new BusinessException("微信支付身份与当前账号不一致，请重新登录");
        }
        return session;
    }

    private void bindWechatIdentity(AppUser user, WechatMiniappClient.SessionInfo session) {
        LambdaQueryWrapper<AppUser> ownerQuery = new LambdaQueryWrapper<AppUser>()
                .eq(AppUser::getOpenid, session.openid());
        if (session.unionid() != null && !session.unionid().isBlank()) {
            ownerQuery.or().eq(AppUser::getUnionid, session.unionid());
        }
        AppUser identityOwner = appUserDao.selectOne(ownerQuery);
        if (identityOwner != null && !Objects.equals(identityOwner.getId(), user.getId())) {
            throw new BusinessException("当前微信已绑定其他账号，请切换账号或联系客服");
        }
        user.setOpenid(session.openid());
        if (session.unionid() != null && !session.unionid().isBlank()) {
            user.setUnionid(session.unionid());
        }
        appUserDao.updateById(user);
    }

    private boolean isPhonePlaceholderOpenid(String openid) {
        return openid == null || openid.isBlank() || openid.matches("^phone_\\d{11}$");
    }

    /**
     * 仅覆盖微信网关实际扣款金额，订单和页面继续保留套餐原价。
     */
    private BigDecimal resolveWechatPaymentAmount(BigDecimal packageAmount) {
        if (wechatPayProperties == null) {
            return packageAmount;
        }
        BigDecimal testAmount = wechatPayProperties.getTestAmount();
        if (testAmount != null && testAmount.compareTo(BigDecimal.ZERO) > 0) {
            return testAmount;
        }
        if (!wechatPayProperties.isForceTestAmount()) {
            return packageAmount;
        }
        BigDecimal forcedTestAmount = wechatPayProperties.getTestPayAmount();
        if (forcedTestAmount == null || forcedTestAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("微信支付测试金额配置不正确");
        }
        return forcedTestAmount;
    }

    @Override
    @Transactional
    public PayResultVO getOrderResult(Long userId, Long orderId) {
        TradeOrder order = tradeOrderDao.selectById(orderId);
        if (order == null) {
            throw new BusinessException("订单不存在");
        }
        if (!order.getUserId().equals(userId)) {
            throw new BusinessException("订单与用户不匹配");
        }
        closeExpiredOrder(order, LocalDateTime.now());
        return buildPayResult(order);
    }

    @Override
    @Transactional
    public PayResultVO confirmWechatPay(Long userId, Long orderId) {
        TradeOrder order = tradeOrderDao.selectByIdForUpdate(orderId);
        if (order == null) {
            throw new BusinessException("订单不存在");
        }
        if (!order.getUserId().equals(userId)) {
            throw new BusinessException("订单与用户不匹配");
        }
        if (OrderStatusEnum.SUCCESS.getCode().equals(order.getOrderStatus())) {
            log.info("微信支付确认幂等返回: userId={}, orderId={}, orderNo={}", userId, orderId, order.getOrderNo());
            return buildPayResult(order);
        }
        if (!OrderStatusEnum.UNPAID.getCode().equals(order.getOrderStatus())) {
            throw new BusinessException("订单状态不正确，无法确认支付");
        }

        if ("wechat_virtual".equals(order.getPayChannel())) {
            return confirmVirtualPayment(userId, order);
        }
        if (closeExpiredOrder(order, LocalDateTime.now())) {
            return buildPayResult(order);
        }

        WechatPayService.WechatPayNotifyResult payResult = wechatPayService.queryOrder(order.getOrderNo());
        LocalDateTime now = LocalDateTime.now();
        PaymentNotifyLog confirmLog = new PaymentNotifyLog();
        confirmLog.setPayChannel("wechat");
        confirmLog.setOrderNo(payResult.outTradeNo());
        confirmLog.setChannelTradeNo(payResult.transactionId());
        confirmLog.setNotifyType("payment_confirm");
        confirmLog.setNotifyPayload(payResult.rawPayload());
        confirmLog.setNotifyTime(now);

        if (!"SUCCESS".equalsIgnoreCase(payResult.tradeState())) {
            order.setPayChannel("wechat");
            order.setNotifySummary(summary(payResult.rawPayload()));
            tradeOrderDao.updateById(order);
            confirmLog.setProcessStatus("ignored");
            confirmLog.setProcessMessage("微信查单未支付成功: " + payResult.tradeState());
            paymentNotifyLogDao.insert(confirmLog);
            log.info("微信支付确认未成功: userId={}, orderId={}, orderNo={}, tradeState={}",
                    userId, orderId, order.getOrderNo(), payResult.tradeState());
            return buildPayResult(order);
        }

        order.setPayChannel("wechat");
        order.setChannelTradeNo(payResult.transactionId());
        order.setNotifySummary(summary(payResult.rawPayload()));
        applySuccessfulPayment(order, now);
        confirmLog.setProcessStatus("success");
        confirmLog.setProcessMessage("主动查单确认成功");
        paymentNotifyLogDao.insert(confirmLog);
        log.info("微信支付主动确认成功: userId={}, orderId={}, orderNo={}, transactionId={}",
                userId, orderId, order.getOrderNo(), payResult.transactionId());
        return buildPayResult(order);
    }

    /** 主动查询并确认微信虚拟支付结果。 */
    private PayResultVO confirmVirtualPayment(Long userId, TradeOrder order) {
        AppUser user = appUserDao.selectById(userId);
        if (user == null || user.getOpenid() == null || user.getOpenid().isBlank()) {
            throw new BusinessException("当前用户缺少微信 openid，无法确认支付");
        }

        WechatVirtualPayService.VirtualPayOrderResult payResult =
                wechatVirtualPayService.queryOrder(user.getOpenid(), order.getOrderNo());
        LocalDateTime now = LocalDateTime.now();
        PaymentNotifyLog confirmLog = new PaymentNotifyLog();
        confirmLog.setPayChannel("wechat_virtual");
        confirmLog.setOrderNo(order.getOrderNo());
        confirmLog.setChannelTradeNo(payResult.transactionId());
        confirmLog.setNotifyType("virtual_payment_confirm");
        confirmLog.setNotifyPayload(payResult.rawPayload());
        confirmLog.setNotifyTime(now);

        if (!payResult.paid()) {
            order.setNotifySummary(summary(payResult.rawPayload()));
            if (closeExpiredOrder(order, now)) {
                confirmLog.setProcessMessage("虚拟支付订单未支付且本地订单已过期");
            } else {
                tradeOrderDao.updateById(order);
                confirmLog.setProcessMessage("微信虚拟支付查单未支付成功，状态：" + payResult.status());
            }
            confirmLog.setProcessStatus("ignored");
            paymentNotifyLogDao.insert(confirmLog);
            return buildPayResult(order);
        }

        order.setChannelTradeNo(payResult.transactionId());
        order.setNotifySummary(summary(payResult.rawPayload()));
        applySuccessfulPayment(order, now);
        if (!payResult.delivered()) {
            wechatVirtualPayService.notifyProvideGoods(order.getOrderNo(), payResult.wxOrderId());
        }
        confirmLog.setProcessStatus("success");
        confirmLog.setProcessMessage(payResult.delivered() ? "虚拟支付已发货并完成入账" : "虚拟支付入账并通知发货成功");
        paymentNotifyLogDao.insert(confirmLog);
        log.info("微信虚拟支付主动确认成功: userId={}, orderId={}, orderNo={}, status={}",
                userId, order.getId(), order.getOrderNo(), payResult.status());
        return buildPayResult(order);
    }

    @Override
    @Transactional
    public void handleWechatNotify(String body) {
        WechatPayService.WechatPayNotifyResult notify = wechatPayService.parseNotify(body);
        LocalDateTime now = LocalDateTime.now();
        PaymentNotifyLog notifyLog = new PaymentNotifyLog();
        notifyLog.setPayChannel("wechat");
        notifyLog.setOrderNo(notify.outTradeNo());
        notifyLog.setChannelTradeNo(notify.transactionId());
        notifyLog.setNotifyType("payment");
        notifyLog.setNotifyPayload(notify.rawPayload());
        notifyLog.setNotifyTime(now);

        try {
            if (!"SUCCESS".equalsIgnoreCase(notify.tradeState())) {
                notifyLog.setProcessStatus("ignored");
                notifyLog.setProcessMessage("非成功支付状态: " + notify.tradeState());
                paymentNotifyLogDao.insert(notifyLog);
                return;
            }

            TradeOrder order = tradeOrderDao.selectByOrderNo(notify.outTradeNo());
            if (order == null) {
                throw new BusinessException("支付回调订单不存在");
            }
            if (OrderStatusEnum.SUCCESS.getCode().equals(order.getOrderStatus())) {
                notifyLog.setProcessStatus("ignored");
                notifyLog.setProcessMessage("订单已支付，幂等忽略");
                paymentNotifyLogDao.insert(notifyLog);
                return;
            }
            if (!OrderStatusEnum.UNPAID.getCode().equals(order.getOrderStatus())) {
                throw new BusinessException("订单状态不正确，无法支付");
            }

            order.setPayChannel("wechat");
            order.setChannelTradeNo(notify.transactionId());
            order.setNotifySummary(summary(notify.rawPayload()));
            applySuccessfulPayment(order, now);
            notifyLog.setProcessStatus("success");
            notifyLog.setProcessMessage("处理成功");
            paymentNotifyLogDao.insert(notifyLog);
            log.info("微信支付回调处理成功: orderNo={}, transactionId={}", notify.outTradeNo(), notify.transactionId());
        } catch (BusinessException ex) {
            notifyLog.setProcessStatus("failed");
            notifyLog.setProcessMessage(ex.getMessage());
            paymentNotifyLogDao.insert(notifyLog);
            throw ex;
        }
    }

    /**
     * 按订单类型处理成功支付
     */
    private void applySuccessfulPayment(TradeOrder order, LocalDateTime now) {
        if (OrderTypeEnum.VIP.getCode().equals(order.getOrderType())) {
            processVipPayment(order, now);
            enqueuePromotionPaymentEvent(
                    "first-vip:" + order.getUserId(),
                    PromotionRewardEventEnum.FIRST_VIP_REWARD.getCode(),
                    order);
        } else if (OrderTypeEnum.COIN.getCode().equals(order.getOrderType())) {
            processCoinPayment(order, now);
            enqueuePromotionPaymentEvent(
                    "first-coin:" + order.getUserId(),
                    PromotionRewardEventEnum.FIRST_COIN_RECHARGE_REWARD.getCode(),
                    order);
        } else {
            throw new BusinessException("不支持的订单类型");
        }
        assetResultNotificationService.publishOrderAfterCommit(order, now);
    }

    private void enqueuePromotionPaymentEvent(String eventKey, String eventType, TradeOrder order) {
        promotionEventInboxService.enqueueBusinessEvent(
                eventKey, eventType, order.getUserId(), order.getOrderNo());
    }

    /**
     * 处理 VIP 支付（更新订单状态 + 计算VIP到期时间 + 更新用户资产）
     *
     * @param order 交易订单
     * @param now   当前时间
     */
    private void processVipPayment(TradeOrder order, LocalDateTime now) {
        // 1. 查询套餐信息
        VipPackage vipPkg = vipPackageDao.selectById(order.getPackageId());
        if (vipPkg == null) {
            throw new BusinessException("VIP 套餐不存在");
        }

        // 2. 更新订单状态
        order.setOrderStatus(OrderStatusEnum.SUCCESS.getCode());
        order.setSuccessTime(now);
        order.setExpireTime(now.plusDays(vipPkg.getDurationDays() != null ? vipPkg.getDurationDays() : 30));
        tradeOrderDao.updateById(order);

        // 3. 查询或创建用户资产
        UserAsset asset = userAssetDao.selectByUserId(order.getUserId());
        if (asset == null) {
            asset = new UserAsset();
            asset.setUserId(order.getUserId());
            asset.setVipStatus(VipStatusEnum.INACTIVE.getCode());
            asset.setCoinBalance(0);
            asset.setTodayFreeWhisperRemain(0);
            asset.setTotalRecharge(BigDecimal.ZERO);
            userAssetDao.insert(asset);
        }

        // 4. 计算 VIP 到期时间：如果已有有效 VIP 则顺延，否则从现在开始
        LocalDateTime vipExpireTime;
        if (VipStatusEnum.ACTIVE.getCode().equals(asset.getVipStatus())
                && asset.getVipExpireTime() != null
                && asset.getVipExpireTime().isAfter(now)) {
            vipExpireTime = asset.getVipExpireTime().plusDays(vipPkg.getDurationDays() != null ? vipPkg.getDurationDays() : 30);
        } else {
            vipExpireTime = now.plusDays(vipPkg.getDurationDays() != null ? vipPkg.getDurationDays() : 30);
        }

        // 5. 更新用户资产
        asset.setVipStatus(VipStatusEnum.ACTIVE.getCode());
        asset.setVipExpireTime(vipExpireTime);
        asset.setTotalRecharge(asset.getTotalRecharge().add(order.getPayAmount()));
        asset.setLastPurchaseTime(now);
        userAssetDao.updateById(asset);
    }

    /**
     * 处理成家币支付（更新订单状态 + 计算币数并更新余额 + 写流水）
     *
     * @param order 交易订单
     * @param now   当前时间
     */
    private void processCoinPayment(TradeOrder order, LocalDateTime now) {
        // 1. 查询套餐信息
        CoinPackage coinPkg = coinPackageDao.selectById(order.getPackageId());
        if (coinPkg == null) {
            throw new BusinessException("千寻币套餐不存在");
        }

        // 2. 更新订单状态
        order.setOrderStatus(OrderStatusEnum.SUCCESS.getCode());
        order.setSuccessTime(now);
        tradeOrderDao.updateById(order);

        // 3. 查询或创建用户资产
        UserAsset asset = userAssetDao.selectByUserId(order.getUserId());
        if (asset == null) {
            asset = new UserAsset();
            asset.setUserId(order.getUserId());
            asset.setVipStatus(VipStatusEnum.INACTIVE.getCode());
            asset.setCoinBalance(0);
            asset.setTodayFreeWhisperRemain(0);
            asset.setTotalRecharge(BigDecimal.ZERO);
            userAssetDao.insert(asset);
        }

        // 4. 计算总币数（基础 + 赠送）
        int totalCoins = (coinPkg.getCoinCount() != null ? coinPkg.getCoinCount() : 0)
                + (coinPkg.getBonusCoinCount() != null ? coinPkg.getBonusCoinCount() : 0);
        int newBalance = (asset.getCoinBalance() != null ? asset.getCoinBalance() : 0) + totalCoins;

        // 5. 原子更新余额，再单独更新充值统计，避免覆盖并发消费产生的新余额
        int updated = userAssetDao.updateCoinBalance(order.getUserId(), totalCoins);
        if (updated != 1) {
            throw new BusinessException("千寻币资产不存在，充值未入账");
        }
        UserAsset updatedAsset = userAssetDao.selectByUserId(order.getUserId());
        int balanceAfter = updatedAsset != null && updatedAsset.getCoinBalance() != null
                ? updatedAsset.getCoinBalance() : newBalance;
        userAssetDao.updateRechargeStats(order.getUserId(), order.getPayAmount(), now);

        // 6. 生成流水编号并写成家币流水
        String flowNo = "CF" + IdUtil.getSnowflakeNextIdStr();
        UserCoinLog coinLog = new UserCoinLog();
        coinLog.setFlowNo(flowNo);
        coinLog.setUserId(order.getUserId());
        coinLog.setFlowType(FlowTypeEnum.RECHARGE.getCode());
        coinLog.setChangeAmount(totalCoins);
        coinLog.setBalanceBefore(balanceAfter - totalCoins);
        coinLog.setBalanceAfter(balanceAfter);
        coinLog.setBizScene(BizSceneEnum.COIN_RECHARGE.getCode());
        coinLog.setBizDesc("购买千寻币套餐：" + coinPkg.getPackageName());
        coinLog.setRefId(order.getId());
        coinLog.setRefType("trade_order");
        userCoinLogDao.insert(coinLog);
    }

    /**
     * 截断回调摘要，避免订单表保存过长内容。
     */
    private String summary(String payload) {
        if (payload == null) {
            return null;
        }
        return payload.length() <= 512 ? payload : payload.substring(0, 512);
    }

    /**
     * 构造支付结果 VO
     *
     * @param order 交易订单
     * @return 支付结果（订单编号、状态、当前资产信息）
     */
    private PayResultVO buildPayResult(TradeOrder order) {
        PayResultVO vo = new PayResultVO();
        vo.setOrderId(order.getId());
        vo.setOrderNo(order.getOrderNo());
        vo.setOrderType(order.getOrderType());
        vo.setPackageName(order.getPackageName());
        vo.setPayAmount(order.getPayAmount());
        vo.setCreateTime(order.getCreateTime());
        vo.setOrderStatus(order.getOrderStatus());
        vo.setExpireTime(order.getExpireTime());
        vo.setSuccessTime(order.getSuccessTime());

        if (OrderTypeEnum.COIN.getCode().equals(order.getOrderType())) {
            CoinPackage coinPkg = coinPackageDao.selectById(order.getPackageId());
            if (coinPkg != null) {
                vo.setCoinAmount((coinPkg.getCoinCount() == null ? 0 : coinPkg.getCoinCount())
                        + (coinPkg.getBonusCoinCount() == null ? 0 : coinPkg.getBonusCoinCount()));
            }
        }

        // 补充当前资产信息
        UserAsset asset = userAssetDao.selectByUserId(order.getUserId());
        if (asset != null) {
            vo.setCoinBalance(asset.getCoinBalance());
            vo.setVipExpireTime(asset.getVipExpireTime());
        }
        return vo;
    }

    /** 关闭已经超过 30 分钟仍未支付的订单，避免结果页一直停留在待支付。 */
    private boolean closeExpiredOrder(TradeOrder order, LocalDateTime now) {
        if (!OrderStatusEnum.UNPAID.getCode().equals(order.getOrderStatus())
                || order.getExpireTime() == null
                || order.getExpireTime().isAfter(now)) {
            return false;
        }
        order.setOrderStatus(OrderStatusEnum.CLOSED.getCode());
        tradeOrderDao.updateById(order);
        return true;
    }
}
