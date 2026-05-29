package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.ContentArticleDao;
import com.spacetime.common.entity.ContentArticle;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.mapper.ContentArticleMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

/**
 * 内容文章数据访问实现
 */
@Repository
@RequiredArgsConstructor
public class ContentArticleDaoImpl implements ContentArticleDao {

    private final ContentArticleMapper contentArticleMapper;

    @Override
    public Page<ContentArticle> selectPage(Page<ContentArticle> page, LambdaQueryWrapper<ContentArticle> wrapper) {
        return contentArticleMapper.selectPage(page, wrapper);
    }

    @Override
    public ContentArticle selectById(Long id) {
        return contentArticleMapper.selectById(id);
    }

    @Override
    public Page<ContentArticle> selectEnabledPage(Page<ContentArticle> page, String type, String category) {
        LocalDateTime now = LocalDateTime.now();
        LambdaQueryWrapper<ContentArticle> wrapper = new LambdaQueryWrapper<ContentArticle>()
                .eq(ContentArticle::getStatus, CommonStatusEnum.ENABLED.getCode())
                .eq(type != null, ContentArticle::getType, type)
                .eq(category != null, ContentArticle::getCategory, category)
                .and(w -> w.isNull(ContentArticle::getEffectiveTime).or().le(ContentArticle::getEffectiveTime, now))
                .and(w -> w.isNull(ContentArticle::getExpireTime).or().gt(ContentArticle::getExpireTime, now))
                .orderByAsc(ContentArticle::getSort)
                .orderByDesc(ContentArticle::getCreateTime);
        return contentArticleMapper.selectPage(page, wrapper);
    }

    @Override
    public void insert(ContentArticle entity) {
        contentArticleMapper.insert(entity);
    }

    @Override
    public void updateById(ContentArticle entity) {
        contentArticleMapper.updateById(entity);
    }

    @Override
    public void deleteById(Long id) {
        contentArticleMapper.deleteById(id);
    }
}
