package com.spacetime.common.dao.impl;

import com.spacetime.common.dao.AppRelationVisitCursorDao;
import com.spacetime.common.entity.AppRelationVisitCursor;
import com.spacetime.common.mapper.AppRelationVisitCursorMapper;
import org.springframework.stereotype.Repository;

/** 访客归并游标数据访问实现。 */
@Repository
public class AppRelationVisitCursorDaoImpl extends AbstractRelationCrudDao<AppRelationVisitCursor> implements AppRelationVisitCursorDao {
    /** 游标 Mapper，仅用于带行锁的领域查询。 */
    private final AppRelationVisitCursorMapper cursorMapper;

    public AppRelationVisitCursorDaoImpl(AppRelationVisitCursorMapper mapper) {
        super(mapper);
        this.cursorMapper = mapper;
    }

    @Override
    public AppRelationVisitCursor selectPairForUpdate(Long visitorUserId, Long targetUserId) {
        return cursorMapper.selectPairForUpdate(visitorUserId, targetUserId);
    }
}
