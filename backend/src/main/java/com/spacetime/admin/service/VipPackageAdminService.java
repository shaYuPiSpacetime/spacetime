package com.spacetime.admin.service;

import com.spacetime.admin.dto.request.VipPackageSaveReq;
import com.spacetime.admin.dto.response.VipPackageVO;

import java.util.List;

/**
 * VIP 套餐后台服务接口
 */
public interface VipPackageAdminService {
    /**
     * 查询全部套餐列表
     * @return 套餐列表
     */
    List<VipPackageVO> list();

    /**
     * 查询套餐详情
     * @param id 套餐ID
     * @return 套餐详情
     */
    VipPackageVO detail(Long id);

    /**
     * 创建套餐
     * @param req 套餐保存请求
     * @return 新套餐ID
     */
    Long create(VipPackageSaveReq req);

    /**
     * 更新套餐
     * @param id 套餐ID
     * @param req 套餐保存请求
     */
    void update(Long id, VipPackageSaveReq req);

    /**
     * 更新套餐状态（启用/停用）
     * @param id 套餐ID
     * @param status 目标状态
     */
    void updateStatus(Long id, String status);
}
