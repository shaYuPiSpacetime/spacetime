package com.spacetime.miniapp.service.impl;

import cn.hutool.core.util.IdUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.dao.CoinPackageDao;
import com.spacetime.common.dao.TradeOrderDao;
import com.spacetime.common.dao.UserAssetDao;
import com.spacetime.common.dao.UserCoinLogDao;
import com.spacetime.common.dao.VipPackageDao;
import com.spacetime.common.entity.CoinPackage;
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
import com.spacetime.miniapp.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 小程序支付服务实现
 */
@Service
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {
    private final VipPackageDao vipPackageDao;
    private final CoinPackageDao coinPackageDao;
    private final TradeOrderDao tradeOrderDao;
    private final UserAssetDao userAssetDao;
    private final UserCoinLogDao userCoinLogDao;

    @Override
    @Transactional
    public CreateOrderVO createOrder(Long userId, CreateOrderReq req) {
        String orderType = req.getOrderType();
        Long packageId = req.getPackageId();

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
                throw new BusinessException("成家币套餐不存在或已下架");
            }
            payAmount = coinPkg.getAmount();
            packageName = coinPkg.getPackageName();
        } else {
            throw new BusinessException("不支持的订单类型");
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
        order.setOrderStatus(OrderStatusEnum.UNPAID.getCode());
        tradeOrderDao.insert(order);

        // 3. 返回创建结果
        CreateOrderVO vo = new CreateOrderVO();
        vo.setOrderId(order.getId());
        vo.setOrderNo(orderNo);
        return vo;
    }

    @Override
    @Transactional
    public PayResultVO mockPay(Long userId, Long orderId) {
        // 1. 查询订单并校验归属
        TradeOrder order = tradeOrderDao.selectById(orderId);
        if (order == null) {
            throw new BusinessException("订单不存在");
        }
        if (!order.getUserId().equals(userId)) {
            throw new BusinessException("订单与用户不匹配");
        }

        // 2. 幂等处理：已支付直接返回当前状态
        if (OrderStatusEnum.SUCCESS.getCode().equals(order.getOrderStatus())) {
            return buildPayResult(order);
        }
        if (!OrderStatusEnum.UNPAID.getCode().equals(order.getOrderStatus())) {
            throw new BusinessException("订单状态不正确，无法支付");
        }

        LocalDateTime now = LocalDateTime.now();

        // 3. 根据订单类型处理支付
        if (OrderTypeEnum.VIP.getCode().equals(order.getOrderType())) {
            processVipPayment(order, now);
        } else if (OrderTypeEnum.COIN.getCode().equals(order.getOrderType())) {
            processCoinPayment(order, now);
        } else {
            throw new BusinessException("不支持的订单类型");
        }

        return buildPayResult(order);
    }

    /** 处理 VIP 支付 */
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

    /** 处理成家币支付 */
    private void processCoinPayment(TradeOrder order, LocalDateTime now) {
        // 1. 查询套餐信息
        CoinPackage coinPkg = coinPackageDao.selectById(order.getPackageId());
        if (coinPkg == null) {
            throw new BusinessException("成家币套餐不存在");
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

        // 5. 原子更新余额并更新资产
        userAssetDao.updateCoinBalance(order.getUserId(), totalCoins);
        asset.setCoinBalance(newBalance);
        asset.setTotalRecharge(asset.getTotalRecharge().add(order.getPayAmount()));
        asset.setLastPurchaseTime(now);
        userAssetDao.updateById(asset);

        // 6. 生成流水编号并写成家币流水
        String flowNo = "CF" + IdUtil.getSnowflakeNextIdStr();
        UserCoinLog coinLog = new UserCoinLog();
        coinLog.setFlowNo(flowNo);
        coinLog.setUserId(order.getUserId());
        coinLog.setFlowType(FlowTypeEnum.RECHARGE.getCode());
        coinLog.setChangeAmount(totalCoins);
        coinLog.setBalanceAfter(newBalance);
        coinLog.setBizScene(BizSceneEnum.COIN_RECHARGE.getCode());
        coinLog.setBizDesc("购买成家币套餐：" + coinPkg.getPackageName());
        coinLog.setRefId(order.getId());
        coinLog.setRefType("trade_order");
        userCoinLogDao.insert(coinLog);
    }

    /** 构造支付结果 */
    private PayResultVO buildPayResult(TradeOrder order) {
        PayResultVO vo = new PayResultVO();
        vo.setOrderNo(order.getOrderNo());
        vo.setOrderStatus(order.getOrderStatus());

        // 补充当前资产信息
        UserAsset asset = userAssetDao.selectByUserId(order.getUserId());
        if (asset != null) {
            vo.setCoinBalance(asset.getCoinBalance());
            vo.setVipExpireTime(asset.getVipExpireTime());
        }
        return vo;
    }
}
