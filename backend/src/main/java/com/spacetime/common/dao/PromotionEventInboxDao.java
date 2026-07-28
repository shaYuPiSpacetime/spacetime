package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.PromotionEventInbox;

/**
 * 推广事件收件箱数据访问接口。
 */
public interface PromotionEventInboxDao {
    PromotionEventInbox selectById(Long id);
    PromotionEventInbox selectByEventKey(String eventKey);
    Page<PromotionEventInbox> selectPage(Page<PromotionEventInbox> page,
                                        LambdaQueryWrapper<PromotionEventInbox> wrapper);
    void insert(PromotionEventInbox entity);
    int updateById(PromotionEventInbox entity);
    int claim(Long id, java.time.LocalDateTime now, java.time.LocalDateTime staleBefore);
}
