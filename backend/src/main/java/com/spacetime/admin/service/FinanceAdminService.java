package com.spacetime.admin.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.FlowPageReq;
import com.spacetime.admin.dto.request.OrderPageReq;
import com.spacetime.admin.dto.request.RefundPageReq;
import com.spacetime.admin.dto.request.RefundReq;
import com.spacetime.admin.dto.response.CoinFlowVO;
import com.spacetime.admin.dto.response.DailyStatsVO;
import com.spacetime.admin.dto.response.TradeOrderDetailVO;
import com.spacetime.admin.dto.response.TradeOrderVO;

/**
 * 财务管理后台服务接口
 */
public interface FinanceAdminService {
    /** 分页查询订单列表 */
    Page<TradeOrderVO> getOrderList(OrderPageReq req);
    /** 查询订单详情 */
    TradeOrderDetailVO getOrderDetail(Long id);
    /** 分页查询成家币流水 */
    Page<CoinFlowVO> getFlowList(FlowPageReq req);
    /** 处理退款 */
    void processRefund(Long id, RefundReq req);
    /** 分页查询退款订单 */
    Page<TradeOrderVO> getRefundList(RefundPageReq req);
    /** 按日统计 */
    DailyStatsVO getDailyStats(String date);
}
