package com.spacetime.miniapp.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dto.PageReq;
import com.spacetime.miniapp.dto.response.CoinBalanceVO;
import com.spacetime.miniapp.dto.response.CoinFlowVO;
import com.spacetime.miniapp.dto.response.CoinPackageVO;

import java.util.List;

/**
 * 小程序成家币服务接口
 */
public interface CoinService {

    /**
     * 查询已启用套餐列表
     *
     * @return 已启用的成家币套餐列表（按排序字段升序）
     */
    List<CoinPackageVO> getPackages();

    /**
     * 查询用户成家币余额
     *
     * @param userId 用户ID
     * @return 成家币余额信息
     */
    CoinBalanceVO getBalance(Long userId);

    /**
     * 分页查询用户成家币流水
     *
     * @param userId 用户ID
     * @param req    分页请求参数
     * @return 成家币流水分页列表
     */
    Page<CoinFlowVO> getFlows(Long userId, PageReq req);
}
