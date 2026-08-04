package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.*;

import java.util.List;

/** PRD-05 扩展领域数据访问聚合接口。 */
public interface CommunityExtensionDao {
    CommunityTopic selectTopicById(Long id);
    CommunityTopic selectTopicOne(LambdaQueryWrapper<CommunityTopic> wrapper);
    Page<CommunityTopic> selectTopicPage(Page<CommunityTopic> page, LambdaQueryWrapper<CommunityTopic> wrapper);
    List<CommunityTopic> selectTopics(LambdaQueryWrapper<CommunityTopic> wrapper);
    void insertTopic(CommunityTopic entity);
    void updateTopic(CommunityTopic entity);
    int updateTopicCas(CommunityTopic entity, int expectedVersion);

    CommunityPostDraft selectDraftOne(LambdaQueryWrapper<CommunityPostDraft> wrapper);
    void insertDraft(CommunityPostDraft entity);
    void updateDraft(CommunityPostDraft entity);
    void deleteDraft(Long id);

    CommunityViewHistory selectViewOne(LambdaQueryWrapper<CommunityViewHistory> wrapper);
    List<CommunityViewHistory> selectViews(LambdaQueryWrapper<CommunityViewHistory> wrapper);
    void insertView(CommunityViewHistory entity);
    void updateView(CommunityViewHistory entity);
    void deleteViews(LambdaQueryWrapper<CommunityViewHistory> wrapper);

    CommunityContentPreference selectPreferenceOne(LambdaQueryWrapper<CommunityContentPreference> wrapper);
    List<CommunityContentPreference> selectPreferences(LambdaQueryWrapper<CommunityContentPreference> wrapper);
    void insertPreference(CommunityContentPreference entity);
    void updatePreference(CommunityContentPreference entity);

    List<CommunityCommentLike> selectCommentLikes(LambdaQueryWrapper<CommunityCommentLike> wrapper);
    CommunityCommentLike selectCommentLikeOne(LambdaQueryWrapper<CommunityCommentLike> wrapper);
    void insertCommentLike(CommunityCommentLike entity);
    void updateCommentLike(CommunityCommentLike entity);

    List<CommunityUserRestriction> selectRestrictions(LambdaQueryWrapper<CommunityUserRestriction> wrapper);
    void insertRestriction(CommunityUserRestriction entity);
    List<CommunityIpBlock> selectIpBlocks(LambdaQueryWrapper<CommunityIpBlock> wrapper);
    void insertIpBlock(CommunityIpBlock entity);

    void insertAudit(CommunityAuditRecord entity);
    List<CommunityAuditRecord> selectAudits(LambdaQueryWrapper<CommunityAuditRecord> wrapper);
    void insertOutbox(CommunityEventOutbox entity);

    CommunityMediaAuditTask selectMediaTaskOne(LambdaQueryWrapper<CommunityMediaAuditTask> wrapper);
    List<CommunityMediaAuditTask> selectMediaTasks(LambdaQueryWrapper<CommunityMediaAuditTask> wrapper);
    void insertMediaTask(CommunityMediaAuditTask entity);
    int updateMediaTaskCas(CommunityMediaAuditTask entity, int expectedVersion);

    CommunityConfigVersion selectConfigVersionOne(LambdaQueryWrapper<CommunityConfigVersion> wrapper);
    List<CommunityConfigVersion> selectConfigVersions(LambdaQueryWrapper<CommunityConfigVersion> wrapper);
    void insertConfigVersion(CommunityConfigVersion entity);

    CommunityExportTask selectExportOne(LambdaQueryWrapper<CommunityExportTask> wrapper);
    Page<CommunityExportTask> selectExportPage(Page<CommunityExportTask> page, LambdaQueryWrapper<CommunityExportTask> wrapper);
    void insertExport(CommunityExportTask entity);
    void updateExport(CommunityExportTask entity);
}
