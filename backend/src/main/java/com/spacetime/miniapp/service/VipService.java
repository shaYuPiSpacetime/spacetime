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
    /** 查询已启用套餐列表 */
    List<VipPackageVO> getPackages();
    /** 查询已启用权益列表 */
    List<VipBenefitVO> getBenefits();
    /** 查询用户 VIP 状态 */
    VipStatusVO getStatus(Long userId);
    /** 分页查询用户 VIP 订单 */
    Page<VipOrderVO> getOrders(Long userId, PageReq req);
}
