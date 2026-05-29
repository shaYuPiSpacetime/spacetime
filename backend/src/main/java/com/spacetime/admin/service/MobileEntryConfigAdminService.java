package com.spacetime.admin.service;

import com.spacetime.admin.dto.request.MobileEntryConfigSaveReq;
import com.spacetime.admin.dto.request.MobileEntrySortReq;
import com.spacetime.admin.dto.request.StatusUpdateReq;
import com.spacetime.admin.dto.response.MobileEntryConfigVO;

import java.util.List;

/**
 * 移动端入口配置管理服务接口
 */
public interface MobileEntryConfigAdminService {
    /**
     * 按页面编码查询入口列表
     *
     * @param pageCode 页面编码
     * @return 入口列表
     */
    List<MobileEntryConfigVO> list(String pageCode);

    /**
     * 创建入口配置
     *
     * @param req 创建请求
     * @return 新入口 ID
     */
    Long create(MobileEntryConfigSaveReq req);

    /**
     * 更新入口配置
     *
     * @param id  入口 ID
     * @param req 更新请求
     */
    void update(Long id, MobileEntryConfigSaveReq req);

    /**
     * 更新入口状态
     *
     * @param id  入口 ID
     * @param req 状态变更请求
     */
    void updateStatus(Long id, StatusUpdateReq req);

    /**
     * 批量更新排序
     *
     * @param req 排序请求
     */
    void sort(MobileEntrySortReq req);

    /**
     * 删除入口配置
     *
     * @param id 入口 ID
     */
    void delete(Long id);
}
