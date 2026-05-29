package com.spacetime.common.dao;

import com.spacetime.common.entity.MobileEntryConfig;

import java.util.List;

/**
 * 移动端入口配置数据访问接口
 */
public interface MobileEntryConfigDao {
    /** 按页面编码查询全部 */
    List<MobileEntryConfig> selectByPageCode(String pageCode);
    /** 按页面编码查询已启用（小程序用） */
    List<MobileEntryConfig> selectEnabledByPageCode(String pageCode);
    /** 按 ID 查询 */
    MobileEntryConfig selectById(Long id);
    /** 按 pageCode + entryKey 查询 */
    MobileEntryConfig selectByPageCodeAndKey(String pageCode, String entryKey);
    /** 新增 */
    void insert(MobileEntryConfig entity);
    /** 更新 */
    void updateById(MobileEntryConfig entity);
    /** 批量更新排序 */
    void batchUpdateSort(List<MobileEntryConfig> entries);
    /** 删除 */
    void deleteById(Long id);
}
