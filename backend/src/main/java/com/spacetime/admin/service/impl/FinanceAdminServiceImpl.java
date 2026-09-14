package com.spacetime.admin.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.FlowPageReq;
import com.spacetime.admin.dto.request.OrderPageReq;
import com.spacetime.admin.dto.request.RefundPageReq;
import com.spacetime.admin.dto.request.RefundReq;
import com.spacetime.admin.dto.response.CoinFlowVO;
import com.spacetime.admin.dto.response.DailyStatsVO;
import com.spacetime.admin.dto.response.ExportTaskVO;
import com.spacetime.admin.dto.response.ReconcileDailyVO;
import com.spacetime.admin.dto.response.RefundDetailVO;
import com.spacetime.admin.dto.response.RefundRecordVO;
import com.spacetime.admin.dto.response.TradeOrderDetailVO;
import com.spacetime.admin.dto.response.TradeOrderVO;
import com.spacetime.admin.service.FinanceAdminService;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.RefundRecordDao;
import com.spacetime.common.dao.TradeOrderDao;
import com.spacetime.common.dao.UserAssetDao;
import com.spacetime.common.dao.UserCoinLogDao;
import com.spacetime.common.dao.UserDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.RefundRecord;
import com.spacetime.common.entity.SysUser;
import com.spacetime.common.entity.TradeOrder;
import com.spacetime.common.entity.UserAsset;
import com.spacetime.common.entity.UserCoinLog;
import com.spacetime.common.enums.BizSceneEnum;
import com.spacetime.common.enums.FlowTypeEnum;
import com.spacetime.common.enums.OrderStatusEnum;
import com.spacetime.common.enums.OrderTypeEnum;
import com.spacetime.common.enums.VipStatusEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.service.AssetResultMessageNotificationService;
import com.spacetime.common.service.WechatVirtualRefundGateway;
import com.spacetime.common.service.WechatVirtualRefundGateway.RefundQueryMismatchException;
import com.spacetime.common.service.WechatVirtualRefundGateway.RefundRequestRejectedException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Supplier;

/**
 * 财务管理后台服务实现
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class FinanceAdminServiceImpl implements FinanceAdminService {
    /** 交易订单数据访问对象 */
    private final TradeOrderDao tradeOrderDao;
    /** 用户成家币流水数据访问对象 */
    private final UserCoinLogDao userCoinLogDao;
    /** 用户资产数据访问对象 */
    private final UserAssetDao userAssetDao;
    /** 用户数据访问对象 */
    private final UserDao userDao;
    /** 退款记录数据访问对象 */
    private final RefundRecordDao refundRecordDao;
    /** 小程序用户数据访问对象，用于读取微信 openid。 */
    private final AppUserDao appUserDao;
    /** 微信虚拟支付退款共享网关。 */
    private final WechatVirtualRefundGateway virtualRefundGateway;
    /** 资产结果系统消息适配器 */
    private final AssetResultMessageNotificationService assetResultNotificationService;
    /** 用于将退款意图、渠道终态和权益回收拆成独立可靠事务。 */
    private final PlatformTransactionManager transactionManager;

    /**
     * 分页查询订单列表，支持多条件筛选
     * @param req 订单分页查询请求
     * @return 订单分页数据
     */
    @Override
    public Page<TradeOrderVO> getOrderList(OrderPageReq req) {
        LambdaQueryWrapper<TradeOrder> wrapper = new LambdaQueryWrapper<TradeOrder>()
                .like(StrUtil.isNotBlank(req.getOrderNo()), TradeOrder::getOrderNo, req.getOrderNo())
                .eq(req.getUserId() != null, TradeOrder::getUserId, req.getUserId())
                .eq(StrUtil.isNotBlank(req.getOrderType()), TradeOrder::getOrderType, req.getOrderType())
                .eq(StrUtil.isNotBlank(req.getOrderStatus()), TradeOrder::getOrderStatus, req.getOrderStatus())
                .ge(req.getPayAmountMin() != null, TradeOrder::getPayAmount, req.getPayAmountMin())
                .le(req.getPayAmountMax() != null, TradeOrder::getPayAmount, req.getPayAmountMax())
                .ge(req.getStartTime() != null, TradeOrder::getCreateTime, req.getStartTime())
                .le(req.getEndTime() != null, TradeOrder::getCreateTime, req.getEndTime())
                .orderByDesc(TradeOrder::getCreateTime);
        Page<TradeOrder> page = tradeOrderDao.selectPage(new Page<>(req.getPage(), req.getSize()), wrapper);
        Page<TradeOrderVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(page.getRecords().stream().map(this::toOrderVO).toList());
        return result;
    }

    /**
     * 查询订单详情，含用户信息（昵称、手机号、头像）
     * @param id 订单ID
     * @return 订单详情
     */
    @Override
    public TradeOrderDetailVO getOrderDetail(Long id) {
        TradeOrder order = requireOrder(id);
        TradeOrderDetailVO vo = new TradeOrderDetailVO();
        copyOrderFields(vo, order);

        // 查询用户信息
        SysUser user = userDao.selectById(order.getUserId());
        if (user != null) {
            vo.setUserNickname(user.getNickname());
            vo.setUserPhone(user.getPhone());
            vo.setUserAvatar(user.getAvatar());
        }
        return vo;
    }

    /**
     * 分页查询成家币流水，支持按用户、流水类型、业务场景、时间范围筛选
     * @param req 流水分页查询请求
     * @return 流水分页数据
     */
    @Override
    public Page<CoinFlowVO> getFlowList(FlowPageReq req) {
        if (!isCoinAssetType(req.getAssetType())) {
            return emptyCoinFlowPage(req);
        }
        LambdaQueryWrapper<UserCoinLog> wrapper = new LambdaQueryWrapper<UserCoinLog>()
                .eq(req.getUserId() != null, UserCoinLog::getUserId, req.getUserId())
                .eq(StrUtil.isNotBlank(req.getFlowType()), UserCoinLog::getFlowType, req.getFlowType())
                .eq(StrUtil.isNotBlank(req.getBizScene()), UserCoinLog::getBizScene, req.getBizScene())
                .ge(req.getStartTime() != null, UserCoinLog::getCreateTime, req.getStartTime())
                .le(req.getEndTime() != null, UserCoinLog::getCreateTime, req.getEndTime())
                .orderByDesc(UserCoinLog::getCreateTime);
        Page<UserCoinLog> page = userCoinLogDao.selectPage(new Page<>(req.getPage(), req.getSize()), wrapper);
        Page<CoinFlowVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(page.getRecords().stream().map(this::toFlowVO).toList());
        return result;
    }

    private boolean isCoinAssetType(String assetType) {
        return StrUtil.isBlank(assetType) || "coin".equalsIgnoreCase(assetType) || "千寻币".equals(assetType);
    }

    private Page<CoinFlowVO> emptyCoinFlowPage(FlowPageReq req) {
        return new Page<>(req.getPage(), req.getSize(), 0);
    }

    /**
     * 处理退款：校验订单状态 → 退回成家币（如适用）→ 更新订单为已退款
     * @param id 订单ID
     * @param req 退款请求
     */
    @Override
    public void processRefund(Long id, RefundReq req) {
        if (!virtualRefundGateway.isEnabled()) {
            throw new BusinessException("微信虚拟支付退款能力尚未启用");
        }
        PreparedVirtualRefund prepared = inNewTransaction(() -> prepareRefundIntent(id, req));
        if (!prepared.requestRequired()) {
            return;
        }
        TradeOrder order = prepared.order();
        RefundRecord refundRecord = prepared.refund();
        log.info("开始处理退款: orderId={}, orderNo={}, reason={}", id, order.getOrderNo(), req.getReason());

        AppUser user;
        try {
            user = requireWechatUser(order.getUserId());
        } catch (RuntimeException exception) {
            inNewTransaction(() -> {
                markRequestRejected(prepared, exception.getMessage());
                return null;
            });
            throw exception;
        }
        int refundFeeFen = toFen(refundRecord.getRefundAmount());
        WechatVirtualRefundGateway.VirtualPaymentOrderSnapshot payment;
        try {
            payment = virtualRefundGateway.queryPaymentOrder(user.getOpenid(), order.getOrderNo());
            if (!payment.paid()) {
                throw new BusinessException("微信虚拟支付原订单不是可退款状态");
            }
            if (payment.leftFeeFen() != refundFeeFen) {
                throw new BusinessException("微信虚拟支付订单剩余可退金额与本地全额不一致");
            }
        } catch (RuntimeException exception) {
            inNewTransaction(() -> {
                markRequestRejected(prepared, exception.getMessage());
                return null;
            });
            throw exception;
        }

        try {
            WechatVirtualRefundGateway.VirtualRefundRequestResult accepted =
                    virtualRefundGateway.requestRefund(
                            user.getOpenid(),
                            order.getOrderNo(),
                            refundRecord.getRefundNo(),
                            payment.leftFeeFen(),
                            refundFeeFen,
                            refundRecord.getRefundReason());
            inNewTransaction(() -> {
                markRequestAccepted(prepared, accepted);
                return null;
            });
        } catch (RefundRequestRejectedException exception) {
            inNewTransaction(() -> {
                markRequestRejected(prepared, exception.getMessage(), "request_rejected");
                return null;
            });
            throw exception;
        } catch (RuntimeException exception) {
            inNewTransaction(() -> {
                markRequestUnknown(prepared, exception.getMessage());
                return null;
            });
            throw exception;
        }
        log.info("微信虚拟支付退款已受理，等待渠道终态: orderId={}, orderNo={}, refundNo={}",
                id, order.getOrderNo(), refundRecord.getRefundNo());
    }

    @Override
    public void reconcileVirtualRefund(Long refundId) {
        RefundRecord refund = refundRecordDao.selectById(refundId);
        if (refund == null) {
            return;
        }
        if ("success".equals(refund.getRefundStatus())) {
            if ("pending".equals(refund.getAssetRollbackAction())) {
                inNewTransaction(() -> {
                    rollbackAssetAfterChannelSuccess(refundId);
                    return null;
                });
            }
            return;
        }
        if (!"processing".equals(refund.getRefundStatus())) return;
        TradeOrder order = requireOrder(refund.getOrderId());
        if (!OrderStatusEnum.REFUNDING.getCode().equals(order.getOrderStatus())) {
            throw new BusinessException("退款单与订单状态不一致，请人工核对");
        }
        AppUser user = requireWechatUser(order.getUserId());
        WechatVirtualRefundGateway.VirtualRefundQueryResult result;
        try {
            if (isRequestUncertain(refund)) {
                result = queryOrResubmitUncertainRefund(refund, order, user);
                if (result == null) {
                    return;
                }
            } else {
                result = virtualRefundGateway.queryRefund(user.getOpenid(), refund.getRefundNo());
            }
        } catch (RefundQueryMismatchException exception) {
            inNewTransaction(() -> {
                markChannelMismatchForManualReview(
                        refundId, null, exception.getRawPayload(), exception.getMessage());
                return null;
            });
            return;
        }
        if (!Objects.equals(refund.getRefundNo(), result.refundOrderNo())) {
            inNewTransaction(() -> {
                markChannelMismatchForManualReview(
                        refundId, result.wxRefundOrderNo(), result.rawPayload(),
                        "微信虚拟支付退款查单返回的商户退款单号与本地不一致");
                return null;
            });
            return;
        }
        if (result.pending()) {
            inNewTransaction(() -> {
                markChannelProcessing(refundId, result);
                return null;
            });
            return;
        }
        if (result.failed()) {
            inNewTransaction(() -> {
                markChannelFailed(refundId, result);
                return null;
            });
            return;
        }
        if (result.orderType() != 1 || result.refundFeeFen() != toFen(refund.getRefundAmount())) {
            inNewTransaction(() -> {
                markChannelMismatchForManualReview(
                        refundId, result.wxRefundOrderNo(), result.rawPayload(),
                        "微信虚拟支付退款终态金额或类型与本地退款意图不一致");
                return null;
            });
            return;
        }

        inNewTransaction(() -> {
            markChannelSuccess(refundId, result);
            return null;
        });
        inNewTransaction(() -> {
            rollbackAssetAfterChannelSuccess(refundId);
            return null;
        });
    }

    /**
     * 进程可能在调用微信前后中断，此时先查同一退款单号；若微信尚未建单，则用同一单号幂等重提。
     */
    private WechatVirtualRefundGateway.VirtualRefundQueryResult queryOrResubmitUncertainRefund(
            RefundRecord refund,
            TradeOrder order,
            AppUser user
    ) {
        try {
            return virtualRefundGateway.queryRefund(user.getOpenid(), refund.getRefundNo());
        } catch (RefundQueryMismatchException exception) {
            throw exception;
        } catch (RuntimeException queryException) {
            try {
                int refundFeeFen = toFen(refund.getRefundAmount());
                WechatVirtualRefundGateway.VirtualPaymentOrderSnapshot payment =
                        virtualRefundGateway.queryPaymentOrder(user.getOpenid(), order.getOrderNo());
                if (!payment.paid() || payment.leftFeeFen() != refundFeeFen) {
                    throw new BusinessException("微信虚拟支付原订单当前无法幂等重提退款");
                }
                WechatVirtualRefundGateway.VirtualRefundRequestResult accepted =
                        virtualRefundGateway.requestRefund(
                                user.getOpenid(),
                                order.getOrderNo(),
                                refund.getRefundNo(),
                                payment.leftFeeFen(),
                                refundFeeFen,
                                refund.getRefundReason());
                inNewTransaction(() -> {
                    markRequestAccepted(refund.getId(), refund, accepted);
                    return null;
                });
                return null;
            } catch (RuntimeException resendException) {
                inNewTransaction(() -> {
                    markRequestUnknown(refund.getId(), refund,
                            "查退款单失败：" + queryException.getMessage()
                                    + "；同号重提失败：" + resendException.getMessage());
                    return null;
                });
                throw resendException;
            }
        }
    }

    private boolean isRequestUncertain(RefundRecord refund) {
        return "request_pending".equals(refund.getChannelRefundStatus())
                || "request_unknown".equals(refund.getChannelRefundStatus());
    }

    private PreparedVirtualRefund prepareRefundIntent(Long orderId, RefundReq req) {
        TradeOrder order = requireOrderForUpdate(orderId);
        RefundRecord existing = refundRecordDao.selectByOrderId(orderId);
        if (existing != null && ("processing".equals(existing.getRefundStatus())
                || "success".equals(existing.getRefundStatus()))) {
            return new PreparedVirtualRefund(order, existing, false);
        }
        if (!OrderStatusEnum.SUCCESS.getCode().equals(order.getOrderStatus())) {
            throw new BusinessException("仅支持对已支付订单进行退款");
        }
        if (!"wechat_virtual".equals(order.getPayChannel())) {
            throw new BusinessException("当前支付渠道尚未接入自动退款，请勿登记为已退款");
        }
        RefundRecord refund = buildRefundRecord(order, req, existing != null);
        validateFullRefund(order, refund.getRefundAmount());
        refund.setRefundStatus("processing");
        refund.setAssetRollbackAction("pending");
        refund.setChannelRefundStatus("request_pending");
        refund.setChannelResponseSummary(null);
        refund.setRefundTime(null);
        refundRecordDao.insert(refund);
        order.setOrderStatus(OrderStatusEnum.REFUNDING.getCode());
        order.setRefundTime(null);
        order.setRefundReason(refund.getRefundReason());
        tradeOrderDao.updateById(order);
        return new PreparedVirtualRefund(order, refund, true);
    }

    private void markRequestAccepted(
            PreparedVirtualRefund prepared,
            WechatVirtualRefundGateway.VirtualRefundRequestResult accepted
    ) {
        markRequestAccepted(prepared.refund().getId(), prepared.refund(), accepted);
    }

    private void markRequestAccepted(
            Long refundId,
            RefundRecord fallback,
            WechatVirtualRefundGateway.VirtualRefundRequestResult accepted
    ) {
        RefundRecord refund = lockRefund(refundId, fallback);
        if (!"processing".equals(refund.getRefundStatus())) return;
        refund.setChannelRefundNo(accepted.wxRefundOrderNo());
        refund.setChannelRefundStatus("accepted");
        refund.setChannelResponseSummary(summary(accepted.rawPayload(), 1000));
        refundRecordDao.updateById(refund);
    }

    private void markRequestUnknown(PreparedVirtualRefund prepared, String message) {
        markRequestUnknown(prepared.refund().getId(), prepared.refund(), message);
    }

    private void markRequestUnknown(Long refundId, RefundRecord fallback, String message) {
        RefundRecord refund = lockRefund(refundId, fallback);
        if (!"processing".equals(refund.getRefundStatus())) return;
        refund.setChannelRefundStatus("request_unknown");
        refund.setChannelResponseSummary(summary(message, 1000));
        refundRecordDao.updateById(refund);
    }

    private void markRequestRejected(PreparedVirtualRefund prepared, String message) {
        markRequestRejected(prepared, message, "precheck_failed");
    }

    private void markRequestRejected(
            PreparedVirtualRefund prepared, String message, String channelRefundStatus) {
        RefundRecord refund = lockRefund(prepared.refund());
        if (!"processing".equals(refund.getRefundStatus())) return;
        refund.setRefundStatus("failed");
        refund.setChannelRefundStatus(channelRefundStatus);
        refund.setChannelResponseSummary(summary(message, 1000));
        refund.setAssetRollbackAction(null);
        refundRecordDao.updateById(refund);
        TradeOrder order = lockOrder(prepared.order());
        order.setOrderStatus(OrderStatusEnum.SUCCESS.getCode());
        order.setRefundTime(null);
        tradeOrderDao.updateById(order);
    }

    private void markChannelProcessing(
            Long refundId, WechatVirtualRefundGateway.VirtualRefundQueryResult result) {
        RefundRecord refund = refundRecordDao.selectByIdForUpdate(refundId);
        if (refund == null || !"processing".equals(refund.getRefundStatus())) return;
        applyChannelSnapshot(refund, result);
        refund.setChannelRefundStatus("processing");
        refundRecordDao.updateById(refund);
    }

    private void markChannelFailed(
            Long refundId, WechatVirtualRefundGateway.VirtualRefundQueryResult result) {
        RefundRecord refund = refundRecordDao.selectByIdForUpdate(refundId);
        if (refund == null || !"processing".equals(refund.getRefundStatus())) return;
        applyChannelSnapshot(refund, result);
        refund.setRefundStatus("failed");
        refund.setChannelRefundStatus("failed");
        refund.setAssetRollbackAction(null);
        refund.setRefundTime(null);
        refundRecordDao.updateById(refund);
        TradeOrder order = requireOrderForUpdate(refund.getOrderId());
        order.setOrderStatus(OrderStatusEnum.SUCCESS.getCode());
        order.setRefundTime(null);
        tradeOrderDao.updateById(order);
    }

    private void markChannelSuccess(
            Long refundId, WechatVirtualRefundGateway.VirtualRefundQueryResult result) {
        completeChannelSuccess(refundId, result, "pending", null);
    }

    private void markChannelMismatchForManualReview(
            Long refundId,
            String wxRefundOrderNo,
            String rawPayload,
            String reviewReason
    ) {
        RefundRecord refund = refundRecordDao.selectByIdForUpdate(refundId);
        if (refund == null || !"processing".equals(refund.getRefundStatus())) return;
        refund.setChannelRefundNo(StrUtil.blankToDefault(wxRefundOrderNo, refund.getChannelRefundNo()));
        refund.setChannelResponseSummary(summary(
                StrUtil.blankToDefault(rawPayload, "") + " | 人工复核：" + reviewReason, 1000));
        // 不把不一致的渠道数据解释为退款成功，同时退出自动对账队列，等待人工核验。
        refund.setRefundStatus("failed");
        refund.setChannelRefundStatus("manual_review");
        refund.setAssetRollbackAction("manual_review:channel_mismatch");
        refund.setRefundTime(null);
        refundRecordDao.updateById(refund);
    }

    private void completeChannelSuccess(
            Long refundId,
            WechatVirtualRefundGateway.VirtualRefundQueryResult result,
            String assetRollbackAction,
            String reviewReason
    ) {
        RefundRecord refund = refundRecordDao.selectByIdForUpdate(refundId);
        if (refund == null || !"processing".equals(refund.getRefundStatus())) return;
        applyChannelSnapshot(refund, result);
        if (StrUtil.isNotBlank(reviewReason)) {
            refund.setChannelResponseSummary(summary(
                    StrUtil.blankToDefault(refund.getChannelResponseSummary(), "")
                            + " | 人工复核：" + reviewReason, 1000));
        }
        LocalDateTime now = LocalDateTime.now();
        refund.setRefundStatus("success");
        refund.setChannelRefundStatus("success");
        refund.setAssetRollbackAction(assetRollbackAction);
        refund.setRefundTime(now);
        refundRecordDao.updateById(refund);
        TradeOrder order = requireOrderForUpdate(refund.getOrderId());
        order.setOrderStatus(OrderStatusEnum.REFUNDED.getCode());
        order.setRefundTime(now);
        order.setRefundReason(refund.getRefundReason());
        tradeOrderDao.updateById(order);
        assetResultNotificationService.publishOrderAfterCommit(order, now);
    }

    private void rollbackAssetAfterChannelSuccess(Long refundId) {
        RefundRecord refund = refundRecordDao.selectByIdForUpdate(refundId);
        if (refund == null || !"success".equals(refund.getRefundStatus())
                || !"pending".equals(refund.getAssetRollbackAction())) {
            return;
        }
        TradeOrder order = requireOrderForUpdate(refund.getOrderId());
        try {
            refund.setAssetRollbackAction(rollbackPurchasedBenefit(order, refund));
        } catch (BusinessException exception) {
            refund.setAssetRollbackAction("manual_review:asset_unavailable");
            refund.setChannelResponseSummary(summary(
                    StrUtil.blankToDefault(refund.getChannelResponseSummary(), "")
                            + " | 权益自动回收失败：" + exception.getMessage(), 1000));
        }
        refundRecordDao.updateById(refund);
    }

    private void applyChannelSnapshot(
            RefundRecord refund, WechatVirtualRefundGateway.VirtualRefundQueryResult result) {
        refund.setChannelRefundNo(StrUtil.blankToDefault(result.wxRefundOrderNo(), refund.getChannelRefundNo()));
        refund.setChannelResponseSummary(summary(result.rawPayload(), 1000));
    }

    private RefundRecord lockRefund(Long refundId, RefundRecord fallback) {
        RefundRecord locked = refundId == null ? null : refundRecordDao.selectByIdForUpdate(refundId);
        return locked == null ? fallback : locked;
    }

    private RefundRecord lockRefund(RefundRecord fallback) {
        return lockRefund(fallback.getId(), fallback);
    }

    private TradeOrder lockOrder(TradeOrder fallback) {
        TradeOrder locked = tradeOrderDao.selectByIdForUpdate(fallback.getId());
        return locked == null ? fallback : locked;
    }

    private <T> T inNewTransaction(Supplier<T> work) {
        TransactionTemplate template = new TransactionTemplate(transactionManager);
        template.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        return template.execute(status -> work.get());
    }

    private record PreparedVirtualRefund(
            TradeOrder order, RefundRecord refund, boolean requestRequired) {
    }

    /**
     * 回收退款订单购买的千寻币，并记录负向退款流水。
     */
    private void reverseCoinPurchase(TradeOrder order, Long refundRecordId) {
        UserAsset asset = userAssetDao.selectByUserIdForUpdate(order.getUserId());
        if (asset == null) {
            throw new BusinessException("用户资产不存在");
        }

        // 使用支付入账流水而非当前套餐配置，避免套餐改价或改币数后回收错误。
        int refundCoinCount = getPurchasedCoinCount(order);

        int balanceBefore = asset.getCoinBalance() == null ? 0 : asset.getCoinBalance();
        if (balanceBefore < refundCoinCount) {
            throw new BusinessException("用户剩余千寻币不足，无法自动回收退款权益");
        }
        int newBalance = balanceBefore - refundCoinCount;
        asset.setCoinBalance(newBalance);
        asset.setTotalRecharge(subtractRecharge(asset.getTotalRecharge(), order.getPayAmount()));
        userAssetDao.updateById(asset);

        // 生成流水号并写入成家币流水
        String flowNo = "REF" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"))
                + UUID.randomUUID().toString().substring(0, 6);
        UserCoinLog coinLog = new UserCoinLog();
        coinLog.setFlowNo(flowNo);
        coinLog.setUserId(order.getUserId());
        coinLog.setFlowType(FlowTypeEnum.REFUND.getCode());
        coinLog.setChangeAmount(-refundCoinCount);
        coinLog.setBalanceBefore(balanceBefore);
        coinLog.setBalanceAfter(newBalance);
        coinLog.setBizScene(BizSceneEnum.REFUND_RETURN.getCode());
        coinLog.setBizDesc("订单 " + order.getOrderNo() + " 退款回收千寻币");
        coinLog.setRefId(refundRecordId);
        coinLog.setRefType("refund_record");
        coinLog.setBizIdempotencyKey("refund:coin:" + refundRecordId);
        userCoinLogDao.insert(coinLog);
    }

    private String rollbackPurchasedBenefit(TradeOrder order, RefundRecord refund) {
        if (OrderTypeEnum.COIN.getCode().equals(order.getOrderType())) {
            reverseCoinPurchase(order, refund.getId());
            return "coin_purchase_reversed";
        }
        if (OrderTypeEnum.VIP.getCode().equals(order.getOrderType())) {
            reverseVipPurchase(order);
            return "vip_membership_reversed";
        }
        throw new BusinessException("不支持的退款订单类型");
    }

    private void reverseVipPurchase(TradeOrder order) {
        if (order.getSuccessTime() == null || order.getExpireTime() == null) {
            throw new BusinessException("订单缺少 VIP 权益归因快照");
        }
        long durationDays = ChronoUnit.DAYS.between(order.getSuccessTime(), order.getExpireTime());
        if (durationDays <= 0) {
            throw new BusinessException("订单 VIP 权益归因天数不正确");
        }
        UserAsset asset = userAssetDao.selectByUserIdForUpdate(order.getUserId());
        if (asset == null || asset.getVipExpireTime() == null) {
            throw new BusinessException("用户 VIP 资产不存在");
        }
        LocalDateTime adjustedExpireTime = asset.getVipExpireTime().minusDays(durationDays);
        asset.setVipExpireTime(adjustedExpireTime);
        asset.setVipStatus(adjustedExpireTime.isAfter(LocalDateTime.now())
                ? VipStatusEnum.ACTIVE.getCode() : VipStatusEnum.EXPIRED.getCode());
        asset.setTotalRecharge(subtractRecharge(asset.getTotalRecharge(), order.getPayAmount()));
        userAssetDao.updateById(asset);
    }

    private BigDecimal subtractRecharge(BigDecimal totalRecharge, BigDecimal refundAmount) {
        BigDecimal result = Objects.requireNonNullElse(totalRecharge, BigDecimal.ZERO)
                .subtract(Objects.requireNonNullElse(refundAmount, BigDecimal.ZERO));
        return result.max(BigDecimal.ZERO);
    }

    /**
     * 获取应退的成家币数量
     */
    private int getPurchasedCoinCount(TradeOrder order) {
        UserCoinLog purchaseLog = userCoinLogDao.selectPurchaseByOrderId(order.getId());
        if (purchaseLog != null
                && purchaseLog.getChangeAmount() != null
                && purchaseLog.getChangeAmount() > 0) {
            return purchaseLog.getChangeAmount();
        }
        throw new BusinessException("未找到订单对应的千寻币充值流水，无法安全回收退款权益");
    }

    /**
     * 分页查询退款订单（退款中 + 已退款状态）
     * @param req 退款订单分页查询请求
     * @return 退款订单分页数据
     */
    @Override
    public Page<RefundRecordVO> getRefundList(RefundPageReq req) {
        LambdaQueryWrapper<RefundRecord> wrapper = new LambdaQueryWrapper<RefundRecord>()
                .like(StrUtil.isNotBlank(req.getOrderNo()), RefundRecord::getOrderNo, req.getOrderNo())
                .eq(req.getUserId() != null, RefundRecord::getUserId, req.getUserId())
                .ge(req.getStartTime() != null, RefundRecord::getCreateTime, req.getStartTime())
                .le(req.getEndTime() != null, RefundRecord::getCreateTime, req.getEndTime())
                .orderByDesc(RefundRecord::getCreateTime);
        Page<RefundRecord> page = refundRecordDao.selectPage(new Page<>(req.getPage(), req.getSize()), wrapper);
        Page<RefundRecordVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(page.getRecords().stream()
                .map(refund -> toRefundVO(refund, tradeOrderDao.selectById(refund.getOrderId())))
                .toList());
        return result;
    }

    @Override
    public RefundDetailVO getRefundDetail(Long id) {
        RefundRecord refund = refundRecordDao.selectById(id);
        if (refund == null) {
            throw new BusinessException("退款记录不存在");
        }
        TradeOrder order = tradeOrderDao.selectById(refund.getOrderId());
        RefundDetailVO vo = new RefundDetailVO();
        vo.setRefund(toRefundVO(refund, order));
        vo.setOrder(order == null ? null : getOrderDetail(order.getId()));
        vo.setAssetRollbackDesc(refund.getAssetRollbackAction());
        return vo;
    }

    /**
     * 按日统计交易数据：VIP订单数、成家币订单数、退款订单数、交易总额
     * @param date 统计日期（格式 yyyy-MM-dd）
     * @return 当日统计数据
     */
    @Override
    public DailyStatsVO getDailyStats(String date) {
        LocalDate localDate = LocalDate.parse(date, DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        LocalDateTime startOfDay = localDate.atStartOfDay();
        LocalDateTime endOfDay = localDate.plusDays(1).atStartOfDay();

        // 查询当日所有订单
        LambdaQueryWrapper<TradeOrder> wrapper = new LambdaQueryWrapper<TradeOrder>()
                .ge(TradeOrder::getCreateTime, startOfDay)
                .lt(TradeOrder::getCreateTime, endOfDay);
        Page<TradeOrder> page = tradeOrderDao.selectPage(new Page<>(1, 10000), wrapper);
        List<TradeOrder> orders = page.getRecords();

        String successCode = OrderStatusEnum.SUCCESS.getCode();
        String refundedCode = OrderStatusEnum.REFUNDED.getCode();
        String vipCode = OrderTypeEnum.VIP.getCode();
        String coinCode = OrderTypeEnum.COIN.getCode();

        DailyStatsVO vo = new DailyStatsVO();
        vo.setDate(date);
        vo.setVipOrderCount(orders.stream()
                .filter(o -> vipCode.equals(o.getOrderType()) && successCode.equals(o.getOrderStatus()))
                .count());
        vo.setCoinOrderCount(orders.stream()
                .filter(o -> coinCode.equals(o.getOrderType()) && successCode.equals(o.getOrderStatus()))
                .count());
        vo.setRefundOrderCount(orders.stream()
                .filter(o -> refundedCode.equals(o.getOrderStatus()))
                .count());
        vo.setTotalAmount(orders.stream()
                .filter(o -> successCode.equals(o.getOrderStatus()))
                .map(TradeOrder::getPayAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add));
        return vo;
    }

    @Override
    public ReconcileDailyVO getReconcileDaily(String date) {
        LocalDate localDate = LocalDate.parse(date, DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        LocalDateTime startOfDay = localDate.atStartOfDay();
        LocalDateTime endOfDay = localDate.plusDays(1).atStartOfDay();

        Page<TradeOrder> orderPage = tradeOrderDao.selectPage(new Page<>(1, 10000),
                new LambdaQueryWrapper<TradeOrder>()
                        .ge(TradeOrder::getCreateTime, startOfDay)
                        .lt(TradeOrder::getCreateTime, endOfDay));
        List<TradeOrder> orders = orderPage.getRecords();
        Page<RefundRecord> refundPage = refundRecordDao.selectPage(new Page<>(1, 10000),
                new LambdaQueryWrapper<RefundRecord>()
                        .ge(RefundRecord::getCreateTime, startOfDay)
                        .lt(RefundRecord::getCreateTime, endOfDay));
        List<RefundRecord> refunds = refundPage.getRecords();

        String successCode = OrderStatusEnum.SUCCESS.getCode();
        String refundedCode = OrderStatusEnum.REFUNDED.getCode();
        BigDecimal orderAmount = orders.stream()
                .filter(o -> successCode.equals(o.getOrderStatus()) || refundedCode.equals(o.getOrderStatus()))
                .map(TradeOrder::getPayAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal refundAmount = refunds.stream()
                .filter(refund -> "success".equals(refund.getRefundStatus()))
                .map(RefundRecord::getRefundAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        ReconcileDailyVO vo = new ReconcileDailyVO();
        vo.setDate(date);
        vo.setSuccessOrderCount(orders.stream().filter(o -> successCode.equals(o.getOrderStatus())).count());
        vo.setVipOrderCount(orders.stream().filter(o -> OrderTypeEnum.VIP.getCode().equals(o.getOrderType())).count());
        vo.setCoinOrderCount(orders.stream().filter(o -> OrderTypeEnum.COIN.getCode().equals(o.getOrderType())).count());
        vo.setRefundOrderCount(refunds.stream()
                .filter(refund -> "success".equals(refund.getRefundStatus()))
                .count());
        vo.setOrderAmount(orderAmount);
        vo.setRefundAmount(refundAmount);
        vo.setNetAmount(orderAmount.subtract(refundAmount));
        vo.setRefundRate(orderAmount.compareTo(BigDecimal.ZERO) == 0
                ? BigDecimal.ZERO
                : refundAmount.divide(orderAmount, 4, java.math.RoundingMode.HALF_UP));
        return vo;
    }

    @Override
    public ExportTaskVO createExportTask(String exportType) {
        ExportTaskVO vo = new ExportTaskVO();
        vo.setTaskNo("EXP" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"))
                + UUID.randomUUID().toString().substring(0, 6));
        vo.setExportType(exportType);
        vo.setStatus("created");
        vo.setMessage("导出任务已创建，请在下载中心查看生成结果");
        vo.setCreateTime(LocalDateTime.now());
        return vo;
    }

    private TradeOrder requireOrder(Long id) {
        TradeOrder order = tradeOrderDao.selectById(id);
        if (order == null) {
            throw new BusinessException("订单不存在");
        }
        return order;
    }

    private TradeOrder requireOrderForUpdate(Long id) {
        TradeOrder order = tradeOrderDao.selectByIdForUpdate(id);
        if (order == null) {
            throw new BusinessException("订单不存在");
        }
        return order;
    }

    private AppUser requireWechatUser(Long userId) {
        AppUser user = appUserDao.selectById(userId);
        if (user == null || StrUtil.isBlank(user.getOpenid())) {
            throw new BusinessException("订单用户缺少微信 openid，无法自动退款");
        }
        return user;
    }

    private void validateFullRefund(TradeOrder order, BigDecimal refundAmount) {
        BigDecimal paid = Objects.requireNonNullElse(order.getPayAmount(), BigDecimal.ZERO);
        if (refundAmount == null || refundAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("退款金额必须大于 0");
        }
        if (refundAmount.compareTo(paid) != 0) {
            throw new BusinessException("虚拟商品暂不支持部分退款，请按订单实付金额全额退款");
        }
        toFen(refundAmount);
    }

    private int toFen(BigDecimal amount) {
        try {
            return amount.movePointRight(2).setScale(0, RoundingMode.UNNECESSARY).intValueExact();
        } catch (ArithmeticException exception) {
            throw new BusinessException("退款金额精度不正确");
        }
    }

    private String summary(String payload, int maxLength) {
        if (payload == null) return null;
        return payload.length() <= maxLength ? payload : payload.substring(0, maxLength);
    }

    private TradeOrderVO toOrderVO(TradeOrder entity) {
        TradeOrderVO vo = new TradeOrderVO();
        copyOrderFields(vo, entity);
        return vo;
    }

    private void copyOrderFields(TradeOrderVO vo, TradeOrder entity) {
        vo.setId(entity.getId());
        vo.setOrderNo(entity.getOrderNo());
        vo.setUserId(entity.getUserId());
        vo.setOrderType(entity.getOrderType());
        vo.setPackageId(entity.getPackageId());
        vo.setPackageName(entity.getPackageName());
        vo.setPayAmount(entity.getPayAmount());
        vo.setPayChannel(entity.getPayChannel());
        vo.setChannelTradeNo(entity.getChannelTradeNo());
        vo.setPrepayId(entity.getPrepayId());
        vo.setNotifySummary(entity.getNotifySummary());
        vo.setOrderStatus(entity.getOrderStatus());
        vo.setSuccessTime(entity.getSuccessTime());
        vo.setExpireTime(entity.getExpireTime());
        vo.setRefundTime(entity.getRefundTime());
        vo.setRefundReason(entity.getRefundReason());
        vo.setRemark(entity.getRemark());
        vo.setCreateTime(entity.getCreateTime());
    }

    private CoinFlowVO toFlowVO(UserCoinLog entity) {
        CoinFlowVO vo = new CoinFlowVO();
        vo.setId(entity.getId());
        vo.setFlowNo(entity.getFlowNo());
        vo.setUserId(entity.getUserId());
        vo.setAssetType("coin");
        vo.setFlowType(entity.getFlowType());
        vo.setChangeAmount(entity.getChangeAmount());
        vo.setBalanceBefore(entity.getBalanceBefore());
        vo.setBalanceAfter(entity.getBalanceAfter());
        vo.setBizScene(entity.getBizScene());
        vo.setBizDesc(entity.getBizDesc());
        vo.setRefId(entity.getRefId());
        vo.setRefType(entity.getRefType());
        vo.setCreateTime(entity.getCreateTime());
        return vo;
    }

    private RefundRecord buildRefundRecord(TradeOrder order, RefundReq req, boolean retryAttempt) {
        UserContext ctx = UserContextHolder.get();
        RefundRecord refund = new RefundRecord();
        String refundNo = "RF" + String.format("%018d", order.getId());
        if (retryAttempt) {
            refundNo += UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        }
        refund.setRefundNo(refundNo);
        refund.setOrderId(order.getId());
        refund.setOrderNo(order.getOrderNo());
        refund.setUserId(order.getUserId());
        refund.setRefundAmount(req.getRefundAmount() != null ? req.getRefundAmount() : Objects.requireNonNullElse(order.getPayAmount(), BigDecimal.ZERO));
        refund.setRefundReason(req.getReason());
        refund.setRefundStatus("processing");
        refund.setOperatorId(ctx != null ? ctx.getId() : null);
        refund.setOperatorName(ctx != null ? ctx.getNickname() : null);
        refund.setChannelRefundStatus("initiating");
        return refund;
    }

    private RefundRecordVO toRefundVO(RefundRecord refund, TradeOrder order) {
        RefundRecordVO vo = new RefundRecordVO();
        vo.setId(refund.getId());
        vo.setRefundNo(refund.getRefundNo());
        vo.setOrderId(refund.getOrderId());
        vo.setOrderNo(refund.getOrderNo());
        vo.setUserId(refund.getUserId());
        vo.setRefundAmount(refund.getRefundAmount());
        vo.setRefundReason(refund.getRefundReason());
        vo.setRefundStatus(refund.getRefundStatus());
        vo.setAssetRollbackAction(refund.getAssetRollbackAction());
        vo.setChannelRefundNo(refund.getChannelRefundNo());
        vo.setChannelRefundStatus(refund.getChannelRefundStatus());
        vo.setChannelResponseSummary(refund.getChannelResponseSummary());
        vo.setRefundTime(refund.getRefundTime());
        vo.setCreateTime(refund.getCreateTime());
        if (order != null) {
            vo.setOrderType(order.getOrderType());
            vo.setPackageName(order.getPackageName());
            vo.setPayAmount(order.getPayAmount());
            vo.setOrderStatus(order.getOrderStatus());
        }
        return vo;
    }
}
