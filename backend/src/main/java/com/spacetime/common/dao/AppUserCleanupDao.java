package com.spacetime.common.dao;

/** App 用户完整业务数据清理数据访问接口。 */
public interface AppUserCleanupDao {

    /** 彻底清理指定用户及其关联业务数据。 */
    void deleteByUserId(Long userId);
}
