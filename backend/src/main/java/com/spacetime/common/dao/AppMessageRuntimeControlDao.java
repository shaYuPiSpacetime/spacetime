package com.spacetime.common.dao;

import com.spacetime.common.entity.AppMessageRuntimeControl;

/** 消息运行时安全开关数据访问接口。 */
public interface AppMessageRuntimeControlDao {
    AppMessageRuntimeControl selectByControlKey(String controlKey);
    AppMessageRuntimeControl selectByControlKeyForUpdate(String controlKey);
    void insert(AppMessageRuntimeControl entity);
    int updateByVersion(AppMessageRuntimeControl entity, int expectedVersion);
}
