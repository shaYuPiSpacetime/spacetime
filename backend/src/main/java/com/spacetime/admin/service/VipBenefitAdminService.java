package com.spacetime.admin.service;

import com.spacetime.admin.dto.request.VipBenefitSaveReq;
import com.spacetime.admin.dto.response.VipBenefitVO;

import java.util.List;

/**
 * VIP 权益后台服务接口
 */
public interface VipBenefitAdminService {
    /**
     * 查询全部权益列表
     * @return 权益列表
     */
    List<VipBenefitVO> list();

    /**
     * 查询权益详情
     * @param id 权益ID
     * @return 权益详情
     */
    VipBenefitVO detail(Long id);

    /**
     * 创建权益
     * @param req 权益保存请求
     * @return 新权益ID
     */
    Long create(VipBenefitSaveReq req);

    /**
     * 更新权益
     * @param id 权益ID
     * @param req 权益保存请求
     */
    void update(Long id, VipBenefitSaveReq req);

    /**
     * 更新权益状态（启用/停用）
     * @param id 权益ID
     * @param status 目标状态
     */
    void updateStatus(Long id, String status);
}
