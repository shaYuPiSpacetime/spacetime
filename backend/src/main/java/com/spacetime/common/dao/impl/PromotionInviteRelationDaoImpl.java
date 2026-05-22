package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.PromotionInviteRelationDao;
import com.spacetime.common.entity.PromotionInviteRelation;
import com.spacetime.common.mapper.PromotionInviteRelationMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/**
 * 邀请关系数据访问实现
 */
@Repository
@RequiredArgsConstructor
public class PromotionInviteRelationDaoImpl implements PromotionInviteRelationDao {
    private final PromotionInviteRelationMapper mapper;

    @Override
    public PromotionInviteRelation selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public PromotionInviteRelation selectByInviteeId(Long inviteeId) {
        return mapper.selectOne(new LambdaQueryWrapper<PromotionInviteRelation>().eq(PromotionInviteRelation::getInviteeId, inviteeId));
    }

    @Override
    public PromotionInviteRelation selectByRelationNo(String relationNo) {
        return mapper.selectOne(new LambdaQueryWrapper<PromotionInviteRelation>().eq(PromotionInviteRelation::getRelationNo, relationNo));
    }

    @Override
    public Page<PromotionInviteRelation> selectPage(Page<PromotionInviteRelation> page, LambdaQueryWrapper<PromotionInviteRelation> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public void insert(PromotionInviteRelation entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(PromotionInviteRelation entity) {
        mapper.updateById(entity);
    }
}
