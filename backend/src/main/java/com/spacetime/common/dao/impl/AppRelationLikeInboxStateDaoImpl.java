package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.dao.AppRelationLikeInboxStateDao;
import com.spacetime.common.entity.AppRelationLikeInboxState;
import com.spacetime.common.mapper.AppRelationLikeInboxStateMapper;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

/** 喜欢收件箱读取状态数据访问实现。 */
@Repository
public class AppRelationLikeInboxStateDaoImpl
        extends AbstractRelationCrudDao<AppRelationLikeInboxState>
        implements AppRelationLikeInboxStateDao {
    private final AppRelationLikeInboxStateMapper mapper;

    public AppRelationLikeInboxStateDaoImpl(AppRelationLikeInboxStateMapper mapper) {
        super(mapper);
        this.mapper = mapper;
    }

    @Override
    public AppRelationLikeInboxState selectByUserId(Long userId) {
        return mapper.selectOne(new LambdaQueryWrapper<AppRelationLikeInboxState>()
                .eq(AppRelationLikeInboxState::getUserId, userId)
                .last("LIMIT 1"));
    }

    @Override
    public int insertIgnore(Long userId, LocalDateTime likedTime, Long likeId, LocalDateTime readAt) {
        return mapper.insertIgnore(userId, likedTime, likeId, readAt);
    }

    @Override
    public int advance(Long userId, LocalDateTime likedTime, Long likeId, LocalDateTime readAt) {
        return mapper.advance(userId, likedTime, likeId, readAt);
    }
}
