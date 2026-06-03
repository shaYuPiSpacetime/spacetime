package com.spacetime.miniapp.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dto.PageReq;
import com.spacetime.miniapp.dto.response.VipBenefitVO;
import com.spacetime.miniapp.dto.response.VipOrderVO;
import com.spacetime.miniapp.dto.response.VipPackageVO;
import com.spacetime.miniapp.dto.response.VipStatusVO;

import java.util.List;

/**
 * 小程序 VIP 服务接口
 */
public interface VipService {

    /**
     * 查询已启用套餐列表
     *
     * @return 已启用的VIP套餐列表（按排序字段升序）
     */
    List<VipPackageVO> getPackages();

    /**
     * 查询已启用权益列表
     *
     * @return 已启用的VIP权益列表（按展示顺序排序）
     */
    List<VipBenefitVO> getBenefits();

    /**
     * 查询用户VIP状态
     *
     * @param userId 用户ID
     * @return 用户VIP状态信息（VIP状态、到期时间）
     */
    VipStatusVO getStatus(Long userId);

    /**
     * 分页查询用户VIP订单
     *
     * @param userId 用户ID
     * @param req    分页请求参数
     * @return VIP订单分页列表
     */
    Page<VipOrderVO> getOrders(Long userId, PageReq req);
}
