package com.spacetime.common.dao.impl;

import com.spacetime.common.dao.AppUserCleanupDao;
import com.spacetime.common.mapper.AppUserCleanupMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/** App 用户完整业务数据清理数据访问实现。 */
@Repository
@RequiredArgsConstructor
public class AppUserCleanupDaoImpl implements AppUserCleanupDao {

    private final AppUserCleanupMapper mapper;

    @Override
    public void deleteByUserId(Long userId) {
        mapper.deleteByUserId(userId);
    }
}
