package com.spacetime.admin.service;

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

/**
 * 财务管理后台服务接口
 */
public interface FinanceAdminService {
    /**
     * 分页查询订单列表
     * @param req 订单分页查询请求
     * @return 订单分页数据
     */
    Page<TradeOrderVO> getOrderList(OrderPageReq req);

    /**
     * 查询订单详情
     * @param id 订单ID
     * @return 订单详情（含用户信息）
     */
    TradeOrderDetailVO getOrderDetail(Long id);

    /**
     * 分页查询成家币流水
     * @param req 流水分页查询请求
     * @return 流水分页数据
     */
    Page<CoinFlowVO> getFlowList(FlowPageReq req);

    /**
     * 处理退款（校验订单状态、退回成家币、更新订单状态）
     * @param id 订单ID
     * @param req 退款请求
     */
    void processRefund(Long id, RefundReq req);

    /**
     * 分页查询退款订单
     * @param req 退款订单分页查询请求
     * @return 退款订单分页数据
     */
    Page<RefundRecordVO> getRefundList(RefundPageReq req);

    /**
     * 查询退款详情
     * @param id 退款记录ID
     * @return 退款详情
     */
    RefundDetailVO getRefundDetail(Long id);

    /**
     * 按日统计交易数据
     * @param date 统计日期（格式 yyyy-MM-dd）
     * @return 当日统计数据
     */
    DailyStatsVO getDailyStats(String date);

    /**
     * 查询轻量日对账
     * @param date 统计日期（格式 yyyy-MM-dd）
     * @return 对账日汇总
     */
    ReconcileDailyVO getReconcileDaily(String date);

    /**
     * 创建导出任务记录
     * @param exportType 导出类型
     * @return 导出任务
     */
    ExportTaskVO createExportTask(String exportType);
}
