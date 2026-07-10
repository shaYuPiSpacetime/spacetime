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
import com.spacetime.miniapp.dto.request.CreateOrderReq;
import com.spacetime.miniapp.dto.response.CreateOrderVO;
import com.spacetime.miniapp.dto.response.PayResultVO;
import com.spacetime.miniapp.dto.response.WechatPayParamsVO;
import com.spacetime.miniapp.service.PaymentService;
import com.spacetime.miniapp.service.WechatPayService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

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
        if (user == null || user.getOpenid() == null || user.getOpenid().isBlank()) {
            throw new BusinessException("当前用户缺少微信 openid，无法发起支付");
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
        order.setPayChannel("wechat");
        order.setOrderStatus(OrderStatusEnum.UNPAID.getCode());
        order.setExpireTime(LocalDateTime.now().plusMinutes(30));
        tradeOrderDao.insert(order);

        // 3. 调用微信 JSAPI 预支付并落库 prepayId
        WechatPayParamsVO payParams = wechatPayService.createJsapiPayParams(order, user.getOpenid(), payAmount);
        order.setPrepayId(payParams.getPrepayId());
        tradeOrderDao.updateById(order);

        // 4. 返回创建结果
        CreateOrderVO vo = new CreateOrderVO();
        vo.setOrderId(order.getId());
        vo.setOrderNo(orderNo);
        vo.setPayAmount(payAmount);
        vo.setPayChannel(order.getPayChannel());
        vo.setPayParams(payParams);
        return vo;
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
        TradeOrder order = tradeOrderDao.selectById(orderId);
        if (order == null) {
            throw new BusinessException("订单不存在");
        }
        if (!order.getUserId().equals(userId)) {
            throw new BusinessException("订单与用户不匹配");
        }
        if (closeExpiredOrder(order, LocalDateTime.now())) {
            return buildPayResult(order);
        }
        if (OrderStatusEnum.SUCCESS.getCode().equals(order.getOrderStatus())) {
            log.info("微信支付确认幂等返回: userId={}, orderId={}, orderNo={}", userId, orderId, order.getOrderNo());
            return buildPayResult(order);
        }
        if (!OrderStatusEnum.UNPAID.getCode().equals(order.getOrderStatus())) {
            throw new BusinessException("订单状态不正确，无法确认支付");
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
        } else if (OrderTypeEnum.COIN.getCode().equals(order.getOrderType())) {
            processCoinPayment(order, now);
        } else {
            throw new BusinessException("不支持的订单类型");
        }
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
