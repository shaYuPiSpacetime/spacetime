package com.spacetime.common.dao;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.PromotionInviteRelation;

/**
 * 邀请关系数据访问接口
 */
public interface PromotionInviteRelationDao {
    PromotionInviteRelation selectById(Long id);
    PromotionInviteRelation selectByInviteeId(Long inviteeId);
    PromotionInviteRelation selectByRelationNo(String relationNo);
    Page<PromotionInviteRelation> selectPage(Page<PromotionInviteRelation> page, com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<PromotionInviteRelation> wrapper);
    void insert(PromotionInviteRelation entity);
    void updateById(PromotionInviteRelation entity);
}
