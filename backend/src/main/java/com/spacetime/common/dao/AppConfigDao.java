package com.spacetime.common.dao;

import com.spacetime.common.entity.AppConfig;

import java.util.List;

/**
 * 应用配置数据访问接口
 */
public interface AppConfigDao {
    /** 按分组查询 */
    List<AppConfig> selectByGroup(String group);
    /** 按 key 查询 */
    AppConfig selectByKey(String configKey);
    /** 按多个 key 查询 */
    List<AppConfig> selectByKeys(List<String> keys);
    /** 查询公开且启用的配置（小程序用） */
    List<AppConfig> selectPublicEnabled(List<String> keys);
    /** 新增或更新（按 configKey） */
    void upsert(AppConfig entity);
}
