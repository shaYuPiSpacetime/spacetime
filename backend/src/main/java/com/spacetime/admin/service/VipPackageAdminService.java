package com.spacetime.admin.service;

import com.spacetime.admin.dto.request.VipPackageSaveReq;
import com.spacetime.admin.dto.response.VipPackageVO;

import java.util.List;

/**
 * VIP 套餐后台服务接口
 */
public interface VipPackageAdminService {
    /** 查询全部套餐列表 */
    List<VipPackageVO> list();
    /** 查询套餐详情 */
    VipPackageVO detail(Long id);
    /** 创建套餐 */
    Long create(VipPackageSaveReq req);
    /** 更新套餐 */
    void update(Long id, VipPackageSaveReq req);
    /** 更新套餐状态 */
    void updateStatus(Long id, String status);
}
