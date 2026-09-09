package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.AppUserRelationBlockDao;
import com.spacetime.common.entity.AppUserRelationBlock;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.mapper.AppUserRelationBlockMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class AppUserRelationBlockDaoImpl implements AppUserRelationBlockDao {
    private final AppUserRelationBlockMapper mapper;

    @Override
    public AppUserRelationBlock selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public AppUserRelationBlock selectActive(Long userId, Long targetUserId, String blockType) {
        return mapper.selectOne(activeWrapper(userId, blockType).eq(AppUserRelationBlock::getTargetUserId, targetUserId));
    }

    @Override
    public List<AppUserRelationBlock> selectActiveByUserId(Long userId, String blockType) {
        return mapper.selectList(activeWrapper(userId, blockType).orderByDesc(AppUserRelationBlock::getCreateTime));
    }

    @Override
    public List<AppUserRelationBlock> selectActiveBetweenUserAndTargets(
            Long userId, Collection<Long> targetUserIds, Collection<String> blockTypes) {
        if (userId == null || targetUserIds == null || targetUserIds.isEmpty()
                || blockTypes == null || blockTypes.isEmpty()) {
            return List.of();
        }
        return mapper.selectList(new LambdaQueryWrapper<AppUserRelationBlock>()
                .eq(AppUserRelationBlock::getStatus, CommonStatusEnum.ENABLED.getCode())
                .in(AppUserRelationBlock::getBlockType, blockTypes)
                .and(scope -> scope
                        .and(outgoing -> outgoing.eq(AppUserRelationBlock::getUserId, userId)
                                .in(AppUserRelationBlock::getTargetUserId, targetUserIds))
                        .or(incoming -> incoming.in(AppUserRelationBlock::getUserId, targetUserIds)
                                .eq(AppUserRelationBlock::getTargetUserId, userId))));
    }

    @Override
    public Page<AppUserRelationBlock> selectPageByUserId(Page<AppUserRelationBlock> page, Long userId, String blockType) {
        return mapper.selectPage(page, activeWrapper(userId, blockType).orderByDesc(AppUserRelationBlock::getCreateTime));
    }

    @Override
    public long countActiveByUserId(Long userId, String blockType) {
        return mapper.selectCount(activeWrapper(userId, blockType));
    }

    @Override
    public void insert(AppUserRelationBlock entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(AppUserRelationBlock entity) {
        mapper.updateById(entity);
    }

    private LambdaQueryWrapper<AppUserRelationBlock> activeWrapper(Long userId, String blockType) {
        return new LambdaQueryWrapper<AppUserRelationBlock>()
                .eq(AppUserRelationBlock::getUserId, userId)
                .eq(AppUserRelationBlock::getBlockType, blockType)
                .eq(AppUserRelationBlock::getStatus, CommonStatusEnum.ENABLED.getCode());
    }
}
