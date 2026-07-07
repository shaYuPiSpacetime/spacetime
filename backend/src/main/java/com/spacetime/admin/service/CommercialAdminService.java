package com.spacetime.admin.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.CommercialConfigSaveReq;
import com.spacetime.admin.dto.response.CommercialConfigLogVO;
import com.spacetime.admin.dto.response.CommercialConfigVO;
import com.spacetime.admin.dto.response.UserCommercialAssetDetailVO;

/**
 * 商业化后台聚合服务接口
 */
public interface CommercialAdminService {
    /**
     * 查询商业化配置聚合数据
     * @return 商业化配置
     */
    CommercialConfigVO getConfig();

    /**
     * 保存商业化配置聚合数据
     * @param req 保存请求
     * @return 保存后的配置
     */
    CommercialConfigVO saveConfig(CommercialConfigSaveReq req);

    /**
     * 查询配置变更日志
     * @param page 页码
     * @param size 页大小
     * @return 配置变更日志分页
     */
    Page<CommercialConfigLogVO> getConfigLogs(long page, long size);

    /**
     * 查询用户商业化资产详情
     * @param userId 用户 ID
     * @return 用户商业化资产详情
     */
    UserCommercialAssetDetailVO getUserAssetDetail(Long userId);
}
