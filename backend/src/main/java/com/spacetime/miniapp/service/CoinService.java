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
    /** 查询已启用套餐列表 */
    List<CoinPackageVO> getPackages();
    /** 查询用户余额 */
    CoinBalanceVO getBalance(Long userId);
    /** 分页查询用户流水 */
    Page<CoinFlowVO> getFlows(Long userId, PageReq req);
}
