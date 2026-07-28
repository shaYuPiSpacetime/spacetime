package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.PromotionEventInboxDao;
import com.spacetime.common.entity.PromotionEventInbox;
import com.spacetime.common.mapper.PromotionEventInboxMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/**
 * 推广事件收件箱数据访问实现。
 */
@Repository
@RequiredArgsConstructor
public class PromotionEventInboxDaoImpl implements PromotionEventInboxDao {
    private final PromotionEventInboxMapper mapper;

    @Override
    public PromotionEventInbox selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public PromotionEventInbox selectByEventKey(String eventKey) {
        return mapper.selectByEventKey(eventKey);
    }

    @Override
    public Page<PromotionEventInbox> selectPage(Page<PromotionEventInbox> page,
                                               LambdaQueryWrapper<PromotionEventInbox> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public void insert(PromotionEventInbox entity) {
        mapper.insert(entity);
    }

    @Override
    public int updateById(PromotionEventInbox entity) {
        return mapper.updateById(entity);
    }

    @Override
    public int claim(Long id, java.time.LocalDateTime now, java.time.LocalDateTime staleBefore) {
        return mapper.claim(id, now, staleBefore);
    }
}
