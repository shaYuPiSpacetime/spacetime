package com.spacetime.common.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

/** App 用户完整业务数据清理 Mapper。 */
@Mapper
public interface AppUserCleanupMapper {

    /** 调用 066 迁移创建的事务安全清理过程。 */
    @Update("CALL spacetime_delete_app_user_data(#{userId})")
    void deleteByUserId(@Param("userId") Long userId);
}
