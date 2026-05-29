package com.spacetime.admin.service;

import com.spacetime.admin.dto.request.VipBenefitSaveReq;
import com.spacetime.admin.dto.response.VipBenefitVO;

import java.util.List;

/**
 * VIP 权益后台服务接口
 */
public interface VipBenefitAdminService {
    /** 查询全部权益列表 */
    List<VipBenefitVO> list();
    /** 查询权益详情 */
    VipBenefitVO detail(Long id);
    /** 创建权益 */
    Long create(VipBenefitSaveReq req);
    /** 更新权益 */
    void update(Long id, VipBenefitSaveReq req);
    /** 更新权益状态 */
    void updateStatus(Long id, String status);
}
