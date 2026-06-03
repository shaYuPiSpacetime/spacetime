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
import com.spacetime.admin.dto.response.TradeOrderDetailVO;
import com.spacetime.admin.dto.response.TradeOrderVO;
import com.spacetime.admin.service.FinanceAdminService;
import com.spacetime.common.dao.CoinPackageDao;
import com.spacetime.common.dao.TradeOrderDao;
import com.spacetime.common.dao.UserAssetDao;
import com.spacetime.common.dao.UserCoinLogDao;
import com.spacetime.common.dao.UserDao;
import com.spacetime.common.entity.CoinPackage;
import com.spacetime.common.entity.SysUser;
import com.spacetime.common.entity.TradeOrder;
import com.spacetime.common.entity.UserAsset;
import com.spacetime.common.entity.UserCoinLog;
import com.spacetime.common.enums.FlowTypeEnum;
import com.spacetime.common.enums.OrderStatusEnum;
import com.spacetime.common.enums.OrderTypeEnum;
import com.spacetime.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

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
    /** 成家币套餐数据访问对象 */
    private final CoinPackageDao coinPackageDao;
    /** 用户数据访问对象 */
    private final UserDao userDao;

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

    /**
     * 处理退款：校验订单状态 → 退回成家币（如适用）→ 更新订单为已退款
     * @param id 订单ID
     * @param req 退款请求
     */
    @Override
    @Transactional
    public void processRefund(Long id, RefundReq req) {
        TradeOrder order = requireOrder(id);

        // 1. 校验订单状态：仅支持退款已支付成功的订单
        if (!OrderStatusEnum.SUCCESS.getCode().equals(order.getOrderStatus())) {
            throw new BusinessException("仅支持对已支付成功的订单进行退款");
        }
        log.info("开始处理退款: orderId={}, orderNo={}, reason={}", id, order.getOrderNo(), req.getReason());

        // 2. 如果是成家币订单，退回成家币
        if (OrderTypeEnum.COIN.getCode().equals(order.getOrderType())) {
            refundCoin(order);
        }

        // 3. 更新订单为已退款
        order.setOrderStatus(OrderStatusEnum.REFUNDED.getCode());
        order.setRefundTime(LocalDateTime.now());
        order.setRefundReason(req.getReason());
        tradeOrderDao.updateById(order);
        log.info("退款处理完成: orderId={}, orderNo={}", id, order.getOrderNo());
    }

    /**
     * 退回成家币：增加用户资产余额并记录流水
     */
    private void refundCoin(TradeOrder order) {
        UserAsset asset = userAssetDao.selectByUserId(order.getUserId());
        if (asset == null) {
            throw new BusinessException("用户资产不存在");
        }

        // 查询套餐获取应退成家币数量
        int refundCoinCount = getRefundCoinCount(order);

        // 更新用户资产余额
        int newBalance = asset.getCoinBalance() + refundCoinCount;
        asset.setCoinBalance(newBalance);
        userAssetDao.updateById(asset);

        // 生成流水号并写入成家币流水
        String flowNo = "REF" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"))
                + UUID.randomUUID().toString().substring(0, 6);
        UserCoinLog coinLog = new UserCoinLog();
        coinLog.setFlowNo(flowNo);
        coinLog.setUserId(order.getUserId());
        coinLog.setFlowType(FlowTypeEnum.REFUND.getCode());
        coinLog.setChangeAmount(refundCoinCount);
        coinLog.setBalanceAfter(newBalance);
        coinLog.setBizScene("订单退款");
        coinLog.setBizDesc("订单 " + order.getOrderNo() + " 退款退回成家币");
        coinLog.setRefId(order.getId());
        coinLog.setRefType("trade_order");
        userCoinLogDao.insert(coinLog);
    }

    /**
     * 获取应退的成家币数量
     */
    private int getRefundCoinCount(TradeOrder order) {
        if (order.getPackageId() != null) {
            CoinPackage coinPackage = coinPackageDao.selectById(order.getPackageId());
            if (coinPackage != null) {
                return coinPackage.getCoinCount() + (coinPackage.getBonusCoinCount() != null ? coinPackage.getBonusCoinCount() : 0);
            }
        }
        throw new BusinessException("未找到对应的成家币套餐信息");
    }

    /**
     * 分页查询退款订单（退款中 + 已退款状态）
     * @param req 退款订单分页查询请求
     * @return 退款订单分页数据
     */
    @Override
    public Page<TradeOrderVO> getRefundList(RefundPageReq req) {
        LambdaQueryWrapper<TradeOrder> wrapper = new LambdaQueryWrapper<TradeOrder>()
                .like(StrUtil.isNotBlank(req.getOrderNo()), TradeOrder::getOrderNo, req.getOrderNo())
                .eq(req.getUserId() != null, TradeOrder::getUserId, req.getUserId())
                .ge(req.getStartTime() != null, TradeOrder::getCreateTime, req.getStartTime())
                .le(req.getEndTime() != null, TradeOrder::getCreateTime, req.getEndTime())
                .and(w -> w.eq(TradeOrder::getOrderStatus, OrderStatusEnum.REFUNDING.getCode())
                        .or().eq(TradeOrder::getOrderStatus, OrderStatusEnum.REFUNDED.getCode()))
                .orderByDesc(TradeOrder::getCreateTime);
        Page<TradeOrder> page = tradeOrderDao.selectPage(new Page<>(req.getPage(), req.getSize()), wrapper);
        Page<TradeOrderVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(page.getRecords().stream().map(this::toOrderVO).toList());
        return result;
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
        String refundingCode = OrderStatusEnum.REFUNDING.getCode();
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
                .filter(o -> refundingCode.equals(o.getOrderStatus()) || refundedCode.equals(o.getOrderStatus()))
                .count());
        vo.setTotalAmount(orders.stream()
                .filter(o -> successCode.equals(o.getOrderStatus()))
                .map(TradeOrder::getPayAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add));
        return vo;
    }

    private TradeOrder requireOrder(Long id) {
        TradeOrder order = tradeOrderDao.selectById(id);
        if (order == null) {
            throw new BusinessException("订单不存在");
        }
        return order;
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
        vo.setFlowType(entity.getFlowType());
        vo.setChangeAmount(entity.getChangeAmount());
        vo.setBalanceAfter(entity.getBalanceAfter());
        vo.setBizScene(entity.getBizScene());
        vo.setBizDesc(entity.getBizDesc());
        vo.setRefId(entity.getRefId());
        vo.setRefType(entity.getRefType());
        vo.setCreateTime(entity.getCreateTime());
        return vo;
    }
}
