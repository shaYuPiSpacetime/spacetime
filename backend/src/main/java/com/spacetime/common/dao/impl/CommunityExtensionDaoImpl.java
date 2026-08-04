package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.CommunityExtensionDao;
import com.spacetime.common.entity.*;
import com.spacetime.common.mapper.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

/** PRD-05 扩展领域数据访问实现。 */
@Repository
@RequiredArgsConstructor
public class CommunityExtensionDaoImpl implements CommunityExtensionDao {
    private final CommunityTopicMapper topicMapper;
    private final CommunityCommentLikeMapper commentLikeMapper;
    private final CommunityPostDraftMapper draftMapper;
    private final CommunityViewHistoryMapper viewMapper;
    private final CommunityContentPreferenceMapper preferenceMapper;
    private final CommunityAuditRecordMapper auditMapper;
    private final CommunityUserRestrictionMapper restrictionMapper;
    private final CommunityIpBlockMapper ipBlockMapper;
    private final CommunityConfigVersionMapper configVersionMapper;
    private final CommunityExportTaskMapper exportMapper;
    private final CommunityEventOutboxMapper outboxMapper;
    private final CommunityMediaAuditTaskMapper mediaAuditTaskMapper;

    public CommunityTopic selectTopicById(Long id) { return topicMapper.selectById(id); }
    public CommunityTopic selectTopicOne(LambdaQueryWrapper<CommunityTopic> wrapper) { return topicMapper.selectOne(wrapper); }
    public Page<CommunityTopic> selectTopicPage(Page<CommunityTopic> page, LambdaQueryWrapper<CommunityTopic> wrapper) { return topicMapper.selectPage(page, wrapper); }
    public List<CommunityTopic> selectTopics(LambdaQueryWrapper<CommunityTopic> wrapper) { return topicMapper.selectList(wrapper); }
    public void insertTopic(CommunityTopic entity) { topicMapper.insert(entity); }
    public void updateTopic(CommunityTopic entity) { topicMapper.updateById(entity); }
    public int updateTopicCas(CommunityTopic entity, int expectedVersion) {
        return topicMapper.update(entity, new LambdaUpdateWrapper<CommunityTopic>()
                .eq(CommunityTopic::getId, entity.getId())
                .eq(CommunityTopic::getVersion, expectedVersion)
                .set(CommunityTopic::getVersion, expectedVersion + 1));
    }

    public CommunityPostDraft selectDraftOne(LambdaQueryWrapper<CommunityPostDraft> wrapper) { return draftMapper.selectOne(wrapper); }
    public void insertDraft(CommunityPostDraft entity) { draftMapper.insert(entity); }
    public void updateDraft(CommunityPostDraft entity) { draftMapper.updateById(entity); }
    public void deleteDraft(Long id) { draftMapper.hardDeleteById(id); }

    public CommunityViewHistory selectViewOne(LambdaQueryWrapper<CommunityViewHistory> wrapper) { return viewMapper.selectOne(wrapper); }
    public List<CommunityViewHistory> selectViews(LambdaQueryWrapper<CommunityViewHistory> wrapper) { return viewMapper.selectList(wrapper); }
    public void insertView(CommunityViewHistory entity) { viewMapper.insert(entity); }
    public void updateView(CommunityViewHistory entity) { viewMapper.updateById(entity); }
    public void deleteViews(LambdaQueryWrapper<CommunityViewHistory> wrapper) { viewMapper.delete(wrapper); }

    public CommunityContentPreference selectPreferenceOne(LambdaQueryWrapper<CommunityContentPreference> wrapper) { return preferenceMapper.selectOne(wrapper); }
    public List<CommunityContentPreference> selectPreferences(LambdaQueryWrapper<CommunityContentPreference> wrapper) { return preferenceMapper.selectList(wrapper); }
    public void insertPreference(CommunityContentPreference entity) { preferenceMapper.insert(entity); }
    public void updatePreference(CommunityContentPreference entity) { preferenceMapper.updateById(entity); }

    public List<CommunityCommentLike> selectCommentLikes(LambdaQueryWrapper<CommunityCommentLike> wrapper) { return commentLikeMapper.selectList(wrapper); }
    public CommunityCommentLike selectCommentLikeOne(LambdaQueryWrapper<CommunityCommentLike> wrapper) { return commentLikeMapper.selectOne(wrapper); }
    public void insertCommentLike(CommunityCommentLike entity) { commentLikeMapper.insert(entity); }
    public void updateCommentLike(CommunityCommentLike entity) { commentLikeMapper.updateById(entity); }

    public List<CommunityUserRestriction> selectRestrictions(LambdaQueryWrapper<CommunityUserRestriction> wrapper) { return restrictionMapper.selectList(wrapper); }
    public void insertRestriction(CommunityUserRestriction entity) { restrictionMapper.insert(entity); }
    public List<CommunityIpBlock> selectIpBlocks(LambdaQueryWrapper<CommunityIpBlock> wrapper) { return ipBlockMapper.selectList(wrapper); }
    public void insertIpBlock(CommunityIpBlock entity) { ipBlockMapper.insert(entity); }

    public void insertAudit(CommunityAuditRecord entity) { auditMapper.insert(entity); }
    public List<CommunityAuditRecord> selectAudits(LambdaQueryWrapper<CommunityAuditRecord> wrapper) { return auditMapper.selectList(wrapper); }
    public void insertOutbox(CommunityEventOutbox entity) { outboxMapper.insert(entity); }

    public CommunityMediaAuditTask selectMediaTaskOne(LambdaQueryWrapper<CommunityMediaAuditTask> wrapper) { return mediaAuditTaskMapper.selectOne(wrapper); }
    public List<CommunityMediaAuditTask> selectMediaTasks(LambdaQueryWrapper<CommunityMediaAuditTask> wrapper) { return mediaAuditTaskMapper.selectList(wrapper); }
    public void insertMediaTask(CommunityMediaAuditTask entity) { mediaAuditTaskMapper.insert(entity); }
    public int updateMediaTaskCas(CommunityMediaAuditTask entity, int expectedVersion) {
        return mediaAuditTaskMapper.update(entity, new LambdaUpdateWrapper<CommunityMediaAuditTask>()
                .eq(CommunityMediaAuditTask::getId, entity.getId())
                .eq(CommunityMediaAuditTask::getVersion, expectedVersion)
                .set(CommunityMediaAuditTask::getVersion, expectedVersion + 1));
    }

    public CommunityConfigVersion selectConfigVersionOne(LambdaQueryWrapper<CommunityConfigVersion> wrapper) { return configVersionMapper.selectOne(wrapper); }
    public List<CommunityConfigVersion> selectConfigVersions(LambdaQueryWrapper<CommunityConfigVersion> wrapper) { return configVersionMapper.selectList(wrapper); }
    public void insertConfigVersion(CommunityConfigVersion entity) { configVersionMapper.insert(entity); }

    public CommunityExportTask selectExportOne(LambdaQueryWrapper<CommunityExportTask> wrapper) { return exportMapper.selectOne(wrapper); }
    public Page<CommunityExportTask> selectExportPage(Page<CommunityExportTask> page, LambdaQueryWrapper<CommunityExportTask> wrapper) { return exportMapper.selectPage(page, wrapper); }
    public void insertExport(CommunityExportTask entity) { exportMapper.insert(entity); }
    public void updateExport(CommunityExportTask entity) { exportMapper.updateById(entity); }
}
