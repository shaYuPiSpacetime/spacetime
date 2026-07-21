package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.spacetime.common.dao.AppRelationMatchPopupDao;
import com.spacetime.common.entity.AppRelationMatchPopup;
import com.spacetime.common.enums.RelationMatchPopupStatusEnum;
import com.spacetime.common.mapper.AppRelationMatchPopupMapper;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/** 匹配弹窗用户状态数据访问实现。 */
@Repository
public class AppRelationMatchPopupDaoImpl extends AbstractRelationCrudDao<AppRelationMatchPopup> implements AppRelationMatchPopupDao {
    /** 匹配弹窗 MyBatis Mapper。 */
    private final AppRelationMatchPopupMapper popupMapper;

    public AppRelationMatchPopupDaoImpl(AppRelationMatchPopupMapper mapper) {
        super(mapper);
        this.popupMapper = mapper;
    }

    @Override
    public int cancelPendingByMatchId(Long matchId, LocalDateTime cancelledTime) {
        return popupMapper.update(new LambdaUpdateWrapper<AppRelationMatchPopup>()
                .eq(AppRelationMatchPopup::getMatchId, matchId)
                .eq(AppRelationMatchPopup::getPopupStatus, RelationMatchPopupStatusEnum.PENDING.getCode())
                .set(AppRelationMatchPopup::getPopupStatus, RelationMatchPopupStatusEnum.CANCELLED.getCode())
                .set(AppRelationMatchPopup::getCancelledTime, cancelledTime));
    }

    @Override
    public int cancelPendingByMatchIds(List<Long> matchIds, LocalDateTime cancelledTime) {
        if (matchIds == null || matchIds.isEmpty()) {
            return 0;
        }
        return popupMapper.update(new LambdaUpdateWrapper<AppRelationMatchPopup>()
                .in(AppRelationMatchPopup::getMatchId, matchIds)
                .eq(AppRelationMatchPopup::getPopupStatus, RelationMatchPopupStatusEnum.PENDING.getCode())
                .set(AppRelationMatchPopup::getPopupStatus, RelationMatchPopupStatusEnum.CANCELLED.getCode())
                .set(AppRelationMatchPopup::getCancelledTime, cancelledTime));
    }
}
