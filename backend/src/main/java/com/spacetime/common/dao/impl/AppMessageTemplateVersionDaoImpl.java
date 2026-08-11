package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.AppMessageTemplateVersionDao;
import com.spacetime.common.entity.AppMessageTemplateVersion;
import com.spacetime.common.mapper.AppMessageTemplateVersionMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

/** 消息模板版本数据访问实现。 */
@Repository
@RequiredArgsConstructor
public class AppMessageTemplateVersionDaoImpl implements AppMessageTemplateVersionDao {
    private final AppMessageTemplateVersionMapper mapper;

    @Override
    public AppMessageTemplateVersion selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public AppMessageTemplateVersion selectCurrent(String templateCode) {
        return mapper.selectOne(new LambdaQueryWrapper<AppMessageTemplateVersion>()
                .eq(AppMessageTemplateVersion::getTemplateCode, templateCode)
                .eq(AppMessageTemplateVersion::getActiveMarker, 1));
    }

    @Override
    public AppMessageTemplateVersion selectByVersion(String templateCode, String versionNo) {
        return mapper.selectOne(new LambdaQueryWrapper<AppMessageTemplateVersion>()
                .eq(AppMessageTemplateVersion::getTemplateCode, templateCode)
                .eq(AppMessageTemplateVersion::getVersionNo, versionNo));
    }

    @Override
    public List<AppMessageTemplateVersion> selectCurrentByNotificationType(String notificationType) {
        return mapper.selectList(new LambdaQueryWrapper<AppMessageTemplateVersion>()
                .eq(AppMessageTemplateVersion::getNotificationType, notificationType)
                .eq(AppMessageTemplateVersion::getStatus, "published")
                .eq(AppMessageTemplateVersion::getActiveMarker, 1)
                .orderByAsc(AppMessageTemplateVersion::getId));
    }

    @Override
    public Page<AppMessageTemplateVersion> selectPage(Page<AppMessageTemplateVersion> page,
                                                       LambdaQueryWrapper<AppMessageTemplateVersion> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public void insert(AppMessageTemplateVersion entity) {
        mapper.insert(entity);
    }

    @Override
    public int updateById(AppMessageTemplateVersion entity) {
        return mapper.updateById(entity);
    }
}
