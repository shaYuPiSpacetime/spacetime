package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.AppMessageTemplateVersion;

import java.util.List;

/** 消息模板版本数据访问接口。 */
public interface AppMessageTemplateVersionDao {
    AppMessageTemplateVersion selectById(Long id);
    AppMessageTemplateVersion selectCurrent(String templateCode);
    AppMessageTemplateVersion selectByVersion(String templateCode, String versionNo);
    List<AppMessageTemplateVersion> selectCurrentByNotificationType(String notificationType);
    Page<AppMessageTemplateVersion> selectPage(Page<AppMessageTemplateVersion> page,
                                               LambdaQueryWrapper<AppMessageTemplateVersion> wrapper);
    void insert(AppMessageTemplateVersion entity);
    int updateById(AppMessageTemplateVersion entity);
}
