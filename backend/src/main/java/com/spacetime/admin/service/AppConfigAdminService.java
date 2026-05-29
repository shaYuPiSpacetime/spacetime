package com.spacetime.admin.service;

import com.spacetime.admin.dto.request.AppConfigBatchReq;
import com.spacetime.admin.dto.response.AppConfigVO;

import java.util.List;

/**
 * 应用配置管理服务接口
 */
public interface AppConfigAdminService {
    /**
     * 按分组查询配置列表
     *
     * @param group 配置分组
     * @return 配置列表
     */
    List<AppConfigVO> list(String group);

    /**
     * 按 key 查询单个配置
     *
     * @param configKey 配置键
     * @return 配置详情
     */
    AppConfigVO getByKey(String configKey);

    /**
     * 批量保存配置
     *
     * @param req 批量保存请求
     */
    void batchSave(AppConfigBatchReq req);
}
