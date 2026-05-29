package com.spacetime.admin.service;

import com.spacetime.admin.dto.request.CoinPackageSaveReq;
import com.spacetime.admin.dto.response.CoinPackageVO;

import java.util.List;

/**
 * 成家币套餐后台服务接口
 */
public interface CoinPackageAdminService {
    /** 查询全部套餐列表 */
    List<CoinPackageVO> list();
    /** 查询套餐详情 */
    CoinPackageVO detail(Long id);
    /** 创建套餐 */
    Long create(CoinPackageSaveReq req);
    /** 更新套餐 */
    void update(Long id, CoinPackageSaveReq req);
    /** 更新套餐状态 */
    void updateStatus(Long id, String status);
}
