package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.dao.AppUserKeywordBlockDao;
import com.spacetime.common.entity.AppUserKeywordBlock;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.mapper.AppUserKeywordBlockMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
@RequiredArgsConstructor
public class AppUserKeywordBlockDaoImpl implements AppUserKeywordBlockDao {
    private final AppUserKeywordBlockMapper mapper;

    @Override
    public AppUserKeywordBlock selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public AppUserKeywordBlock selectActiveByUserAndKeyword(Long userId, String keyword) {
        return mapper.selectOne(activeWrapper(userId).eq(AppUserKeywordBlock::getKeyword, keyword));
    }

    @Override
    public List<AppUserKeywordBlock> selectActiveByUserId(Long userId) {
        return mapper.selectList(activeWrapper(userId).orderByDesc(AppUserKeywordBlock::getCreateTime));
    }

    @Override
    public long countActiveByUserId(Long userId) {
        return mapper.selectCount(activeWrapper(userId));
    }

    @Override
    public void insert(AppUserKeywordBlock entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(AppUserKeywordBlock entity) {
        mapper.updateById(entity);
    }

    private LambdaQueryWrapper<AppUserKeywordBlock> activeWrapper(Long userId) {
        return new LambdaQueryWrapper<AppUserKeywordBlock>()
                .eq(AppUserKeywordBlock::getUserId, userId)
                .eq(AppUserKeywordBlock::getStatus, CommonStatusEnum.ENABLED.getCode());
    }
}
