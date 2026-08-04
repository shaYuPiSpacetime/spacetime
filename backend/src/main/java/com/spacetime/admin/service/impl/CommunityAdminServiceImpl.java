package com.spacetime.admin.service.impl;

import cn.hutool.core.util.StrUtil;
import cn.hutool.core.util.IdUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.admin.dto.request.*;
import com.spacetime.admin.dto.response.*;
import com.spacetime.admin.service.CommunityAdminService;
import com.spacetime.admin.service.AppUserAdminService;
import com.spacetime.common.constant.CommunityConfigKeys;
import com.spacetime.common.dao.*;
import com.spacetime.common.entity.*;
import com.spacetime.common.enums.*;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.exception.ForbiddenException;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.util.DesensitizeUtil;
import com.spacetime.common.util.OssUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.net.URI;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 后台社区管理服务实现
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class CommunityAdminServiceImpl implements CommunityAdminService {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final Set<String> PUBLIC_COMMUNITY_CONFIG_KEYS = Set.of(
            CommunityConfigKeys.INTERACTION_GATE_MODE,
            CommunityConfigKeys.POST_MAX_IMAGES,
            CommunityConfigKeys.POST_MAX_TEXT_LENGTH,
            CommunityConfigKeys.POST_MAX_MENTIONS,
            CommunityConfigKeys.SINCERE_POST_MIN_TEXT_LENGTH,
            CommunityConfigKeys.CONTACT_INFO_ALLOWED,
            CommunityConfigKeys.REPORT_ENTRY_ENABLED
    );
    private static final Set<String> TERMINAL_REPORT_STATUSES = Set.of("valid", "invalid", "merged");
    private static final String TOPIC_COVER_HOST = "shikongxiehou.oss-cn-shanghai.aliyuncs.com";
    private static final Set<String> TOPIC_DISPLAY_SCENES = Set.of("hot", "topic_list", "publish");

    /** 社区动态数据访问对象 */
    private final CommunityPostDao communityPostDao;
    /** 社区评论数据访问对象 */
    private final CommunityCommentDao communityCommentDao;
    /** 社区举报数据访问对象 */
    private final CommunityReportDao communityReportDao;
    /** 应用配置数据访问对象 */
    private final AppConfigDao appConfigDao;
    /** 移动端入口配置数据访问对象 */
    private final MobileEntryConfigDao mobileEntryConfigDao;
    /** 字典数据访问对象 */
    private final DictDataDao dictDataDao;
    /** 用户数据访问对象 */
    private final UserDao userDao;
    /** 小程序用户数据访问对象 */
    private final AppUserDao appUserDao;
    /** 内容操作日志数据访问对象 */
    private final ContentOperationLogDao contentOperationLogDao;
    /** PRD-05 扩展领域数据访问对象 */
    private final CommunityExtensionDao communityExtensionDao;
    /** 公共账号治理服务，仅复用冻结能力 */
    private final AppUserAdminService appUserAdminService;
    /** OSS 直传票据工具 */
    private final OssUtil ossUtil;
    /** JSON 序列化器 */
    private final ObjectMapper objectMapper;

    @Override
    public CommunityAdminMetaVO getMeta() {
        CommunityAdminMetaVO vo = new CommunityAdminMetaVO();
        putOptions(vo, "contentType", "community_content_type");
        putOptions(vo, "contentStatus", "community_content_status");
        putOptions(vo, "sourceScene", "community_source_scene");
        putOptions(vo, "mediaType", "community_media_type");
        putOptions(vo, "machineResult", "community_machine_result");
        putOptions(vo, "riskLevel", "community_risk_level");
        putOptions(vo, "postAction", "community_post_action");
        putOptions(vo, "distributionScene", "community_distribution_scene");
        putOptions(vo, "commentStatus", "community_comment_status");
        putOptions(vo, "commentAction", "community_comment_action");
        putOptions(vo, "reportStatus", "community_report_status");
        putOptions(vo, "reportResult", "community_report_result");
        putOptions(vo, "replyStatus", "community_reply_status");
        putOptions(vo, "reportTargetType", "community_report_target_type");
        putOptions(vo, "reportReason", "community_report_reason");
        putOptions(vo, "punishAction", "community_punish_action");
        putOptions(vo, "mutePeriod", "community_mute_period");
        putOptions(vo, "ipBlockPeriod", "community_ip_block_period");
        putOptions(vo, "writeScope", "community_write_scope");
        putOptions(vo, "topicStatus", "community_topic_status");
        putOptions(vo, "topicDisplayScene", "community_topic_display_scene");
        putOptions(vo, "yesNo", "community_yes_no");
        putOptions(vo, "configSection", "community_config_section");
        putOptions(vo, "interactionGateMode", "community_interaction_gate_mode");
        for (AppConfig config : appConfigDao.selectByGroup("COMMUNITY_COPY")) {
            String key = config.getConfigKey().replace(CommunityConfigKeys.COPY_PREFIX, "");
            vo.getCopy().put(key, config.getConfigValue());
        }
        vo.getCapabilities().put("chatReportContext", false);
        CommunityConfigVersion latest = latestConfigVersion();
        vo.setConfigVersion(latest == null ? 0 : latest.getVersion());
        return vo;
    }

    @Override
    public CommunityStatsVO getPostStats(String scope) {
        List<CommunityPost> values = communityPostDao.selectList(new LambdaQueryWrapper<CommunityPost>()
                .eq("moments".equals(scope), CommunityPost::getPostType, CommunityPostTypeEnum.COMMUNITY.getCode()));
        return stats(List.of(
                stat("total", message("stat_post_total"), values.size(), "default"),
                stat("pending", message("stat_post_pending"), countStatus(values, "pending_machine", "pending_manual"), "warning"),
                stat("published", message("stat_post_published"), countStatus(values, "published"), "success"),
                stat("blocked", message("stat_post_blocked"), countStatus(values, "blocked", "rejected"), "danger")
        ));
    }

    @Override
    @Transactional
    public void updatePostStatus(Long id, CommunityStatusCommandReq req) {
        CommunityPost entity = requirePost(id);
        ensureVersion(entity.getVersion(), req.getVersion());
        String before = entity.getStatus();
        String target = resolveContentAction(req.getAction(), false);
        validateContentTransition(before, target, false, Objects.equals(entity.getDeletedByUser(), 1));
        entity.setStatus(target);
        applyAuditStatus(entity, target);
        entity.setHandledAt(LocalDateTime.now());
        if (communityPostDao.updateCas(entity, req.getVersion()) != 1) throw versionConflict();
        writeAudit("post", entity.getPostNo(), entity.getId(), req.getAction(), before, entity.getStatus(), req.getReason());
        if (Boolean.TRUE.equals(req.getNotifyUser())) {
            writeModerationResult("post", entity.getPostNo(), req.getVersion() + 1,
                    entity.getAuthorId(), entity.getStatus(), req.getReason());
        }
    }

    @Override
    public CommunityStatsVO getCommentStats() {
        List<CommunityComment> values = communityCommentDao.selectList(new LambdaQueryWrapper<>());
        return stats(List.of(
                stat("total", message("stat_comment_total"), values.size(), "default"),
                stat("pending", message("stat_comment_pending"), countCommentStatus(values, "pending_machine"), "warning"),
                stat("published", message("stat_comment_published"), countCommentStatus(values, "published"), "success"),
                stat("blocked", message("stat_comment_blocked"), countCommentStatus(values, "blocked", "rejected"), "danger")
        ));
    }

    @Override
    public CommunityCommentAdminVO getCommentDetail(Long id) {
        return toCommentAdminVO(requireComment(id));
    }

    @Override
    @Transactional
    public void updateCommentStatus(Long id, CommunityStatusCommandReq req) {
        CommunityComment entity = requireComment(id);
        ensureVersion(entity.getVersion(), req.getVersion());
        String before = entity.getStatus();
        String normalizedAction = StrUtil.blankToDefault(req.getAction(), "").toLowerCase(Locale.ROOT);
        if (Set.of("warn_user", "mute_user").contains(normalizedAction)) {
            if (StrUtil.isBlank(req.getReason())) throw error("reason_required");
            if ("mute_user".equals(normalizedAction)) {
                requireContextPermission("community:comment:risk");
                CommunityUserRestriction restriction = new CommunityUserRestriction();
                restriction.setUserId(entity.getAuthorId());
                restriction.setRestrictionType("mute");
                restriction.setReason(StrUtil.trim(req.getReason()));
                restriction.setStartTime(LocalDateTime.now());
                restriction.setEndTime(resolveUntil(req.getMutePeriod()));
                restriction.setStatus("active");
                restriction.setActiveMarker(1);
                restriction.setVersion(0);
                communityExtensionDao.insertRestriction(restriction);
            }
            if (communityCommentDao.updateCas(entity, req.getVersion()) != 1) throw versionConflict();
            writeAudit("comment", entity.getCommentNo(), entity.getId(), normalizedAction,
                    before, before, req.getReason());
            writeModerationResult("comment", entity.getCommentNo(), req.getVersion() + 1,
                    entity.getAuthorId(), normalizedAction, req.getReason());
            return;
        }
        String target = resolveContentAction(req.getAction(), true);
        validateContentTransition(before, target, true, false);
        entity.setStatus(target);
        applyAuditStatus(entity, target);
        if (communityCommentDao.updateCas(entity, req.getVersion()) != 1) throw versionConflict();
        syncPostCommentCount(entity.getPostId(), before, target);
        writeAudit("comment", entity.getCommentNo(), entity.getId(), req.getAction(), before, entity.getStatus(), req.getReason());
        if (Boolean.TRUE.equals(req.getNotifyUser())) {
            writeModerationResult("comment", entity.getCommentNo(), req.getVersion() + 1,
                    entity.getAuthorId(), entity.getStatus(), req.getReason());
        }
    }

    @Override
    public CommunityStatsVO getReportStats() {
        List<CommunityReport> values = communityReportDao.selectList(new LambdaQueryWrapper<>());
        return stats(List.of(
                stat("total", message("stat_report_total"), values.size(), "default"),
                stat("pending", message("stat_report_pending"), countReportStatus(values, "pending", "processing"), "warning"),
                stat("valid", message("stat_report_valid"), countReportStatus(values, "valid"), "danger"),
                stat("closed", message("stat_report_closed"), countReportStatus(values, "invalid", "merged"), "success")
        ));
    }

    @Override
    public CommunityReportAdminVO getReportDetail(Long id) {
        return toReportAdminVO(requireReport(id));
    }

    @Override
    @Transactional
    public void updateReportStatus(Long id, CommunityReportStatusReq req) {
        CommunityReport report = requireReport(id);
        if (TERMINAL_REPORT_STATUSES.contains(StrUtil.blankToDefault(report.getStatus(), "").toLowerCase(Locale.ROOT))) {
            throw error("report_already_handled");
        }
        ensureVersion(report.getVersion(), req.getVersion());
        CommunityReportStatusEnum result = CommunityReportStatusEnum.getByCode(req.getResult());
        if (result == null) throw error("unsupported_report_result");
        String before = report.getStatus();
        report.setStatus(result.getCode());
        report.setHandleAction(StrUtil.blankToDefault(req.getAction(), result.getCode()));
        report.setPunishmentAction(StrUtil.blankToDefault(req.getPunishAction(), CommunityReportHandleActionEnum.NONE.getCode()));
        report.setHandleRemark(StrUtil.trim(req.getHandleRemark()));
        report.setHandlerId(currentUserId());
        report.setHandlerTime(LocalDateTime.now());
        report.setReplyStatus(Boolean.TRUE.equals(req.getReplyReporter()) ? "sent" : "pending");
        if (result == CommunityReportStatusEnum.MERGED) mergeReport(report, req.getMergeIntoReportNo());
        if (result == CommunityReportStatusEnum.VALID) applyPunishment(report, req);
        if (communityReportDao.updateCas(report, req.getVersion()) != 1) throw versionConflict();
        writeAudit("report", report.getReportNo(), report.getId(), req.getAction(), before, report.getStatus(), req.getHandleRemark());
        if (Boolean.TRUE.equals(req.getReplyReporter())) {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("recipientUserId", report.getReporterId());
            payload.put("reportNo", report.getReportNo());
            payload.put("result", report.getStatus());
            payload.put("handleRemark", report.getHandleRemark());
            writeOutbox("report_result", "report", report.getReportNo(), req.getVersion() + 1, json(payload));
        }
    }

    @Override
    public CommunityStatsVO getTopicStats() {
        List<CommunityTopic> values = communityExtensionDao.selectTopics(new LambdaQueryWrapper<>());
        long enabled = values.stream().filter(item -> "enabled".equalsIgnoreCase(item.getStatus())).count();
        long recommended = values.stream().filter(item -> Objects.equals(item.getRecommended(), 1)).count();
        return stats(List.of(
                stat("total", message("stat_topic_total"), values.size(), "default"),
                stat("enabled", message("stat_topic_enabled"), enabled, "success"),
                stat("recommended", message("stat_topic_recommended"), recommended, "info"),
                stat("disabled", message("stat_topic_disabled"), values.size() - enabled, "danger")
        ));
    }

    @Override
    public Page<CommunityTopicAdminVO> getTopicPage(CommunityTopicPageReq req) {
        LambdaQueryWrapper<CommunityTopic> wrapper = new LambdaQueryWrapper<CommunityTopic>()
                .and(StrUtil.isNotBlank(req.getKeyword()), w -> w.like(CommunityTopic::getTopicName, req.getKeyword())
                        .or().like(CommunityTopic::getTopicCode, req.getKeyword())
                        .or().like(CommunityTopic::getDescription, req.getKeyword()))
                .eq(StrUtil.isNotBlank(req.getStatus()), CommunityTopic::getStatus, req.getStatus())
                .eq(req.getRecommended() != null, CommunityTopic::getRecommended, Boolean.TRUE.equals(req.getRecommended()) ? 1 : 0)
                .ge(req.getStartTime() != null, CommunityTopic::getUpdateTime,
                        req.getStartTime() == null ? null : req.getStartTime().atStartOfDay())
                .lt(req.getEndTime() != null, CommunityTopic::getUpdateTime,
                        req.getEndTime() == null ? null : req.getEndTime().plusDays(1).atStartOfDay())
                .orderByDesc(CommunityTopic::getRecommended)
                .orderByAsc(CommunityTopic::getSort)
                .orderByDesc(CommunityTopic::getUpdateTime);
        Page<CommunityTopic> page = communityExtensionDao.selectTopicPage(new Page<>(req.getPage(), req.getSize()), wrapper);
        Page<CommunityTopicAdminVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(toTopicAdminVOs(page.getRecords()));
        return result;
    }

    @Override
    public CommunityTopicAdminVO getTopicDetail(Long id) {
        return toTopicAdminVO(requireTopic(id), true);
    }

    @Override
    @Transactional
    public CommunityTopicAdminVO createTopic(CommunityTopicSaveReq req) {
        validateTopicCover(req.getCoverUrl());
        validateTopicDisplayScenes(req.getDisplayScenes());
        ensureUniqueTopicName(req.getTopicName(), null, req.getStatus());
        CommunityTopic entity = new CommunityTopic();
        entity.setTopicCode("topic_" + IdUtil.fastSimpleUUID().substring(0, 12));
        applyTopic(entity, req);
        entity.setVersion(0);
        communityExtensionDao.insertTopic(entity);
        writeAudit("topic", entity.getTopicCode(), entity.getId(), "create", null, entity.getStatus(), req.getRemark());
        return toTopicAdminVO(entity, true);
    }

    @Override
    @Transactional
    public CommunityTopicAdminVO updateTopic(Long id, CommunityTopicSaveReq req) {
        CommunityTopic entity = requireTopic(id);
        if (req.getVersion() == null) throw error("version_required");
        ensureVersion(entity.getVersion(), req.getVersion());
        validateTopicCover(req.getCoverUrl());
        validateTopicDisplayScenes(req.getDisplayScenes());
        ensureUniqueTopicName(req.getTopicName(), id, req.getStatus());
        String before = json(entity);
        applyTopic(entity, req);
        if (communityExtensionDao.updateTopicCas(entity, req.getVersion()) != 1) throw versionConflict();
        entity.setVersion(req.getVersion() + 1);
        writeAudit("topic", entity.getTopicCode(), id, "update", before, json(entity), req.getRemark());
        return toTopicAdminVO(entity, true);
    }

    @Override
    @Transactional
    public void updateTopicStatus(Long id, CommunityTopicStatusReq req) {
        CommunityTopic entity = requireTopic(id);
        ensureVersion(entity.getVersion(), req.getVersion());
        ensureUniqueTopicName(entity.getTopicName(), id, req.getStatus());
        String before = entity.getStatus();
        entity.setStatus(req.getStatus());
        if (communityExtensionDao.updateTopicCas(entity, req.getVersion()) != 1) throw versionConflict();
        writeAudit("topic", entity.getTopicCode(), id, "status", before, req.getStatus(), req.getRemark());
    }

    @Override
    public CommunityOssTicketVO createTopicCoverTicket(CommunityCoverTicketReq req) {
        if (req.getFileSizeBytes() > 10 * 1024 * 1024L) throw error("topic_cover_too_large");
        if (!Set.of("image/jpeg", "image/png", "image/webp").contains(req.getContentType())) {
            throw error("topic_cover_type_invalid");
        }
        OssUtil.DirectUploadPolicy ticket = ossUtil.createDirectUploadPolicy(req.getFileName(), 10 * 1024 * 1024L);
        CommunityOssTicketVO vo = new CommunityOssTicketVO();
        vo.setUploadUrl(ticket.uploadUrl());
        vo.setKey(ticket.key());
        vo.setFormData(ticket.formData());
        vo.setExpiresAt(Instant.ofEpochSecond(ticket.expiresAt()).toString());
        vo.setFileUrl(ossUtil.toCdnUrl(ticket.key()));
        return vo;
    }

    @Override
    @Transactional
    public CommunityExportTaskVO createExport(CommunityExportCreateReq req) {
        if (!Set.of("posts", "comments", "reports", "topics").contains(req.getExportType())) {
            throw error("unsupported_export_type");
        }
        CommunityExportTask entity = new CommunityExportTask();
        entity.setTaskNo("EXP" + System.currentTimeMillis() + IdUtil.fastSimpleUUID().substring(0, 6));
        entity.setExportType(req.getExportType());
        entity.setFilterJson(json(req.getFilters() == null ? Map.of() : req.getFilters()));
        entity.setStatus("pending");
        entity.setProgress(0);
        entity.setRequesterId(currentUserId());
        communityExtensionDao.insertExport(entity);
        writeAudit("export", entity.getTaskNo(), entity.getId(), "create", null, entity.getFilterJson(), null);
        return toExportVO(entity);
    }

    @Override
    public CommunityConfigVersionVO getConfigVersion() {
        CommunityConfigVersion latest = latestConfigVersion();
        List<CommunityConfigItemVO> items = latest == null ? defaultConfigItems() : readConfigItems(latest.getConfigSnapshot());
        return toConfigVersionVO(latest, items);
    }

    @Override
    @Transactional
    public CommunityConfigVersionVO saveConfigVersion(CommunityConfigVersionSaveReq req) {
        CommunityConfigVersion latest = latestConfigVersion();
        int current = latest == null ? 0 : latest.getVersion();
        ensureVersion(current, req.getVersion());

        List<CommunityConfigItemVO> canonicalItems = defaultConfigItems();
        Map<String, CommunityConfigItemVO> canonicalByKey = canonicalItems.stream()
                .collect(Collectors.toMap(CommunityConfigItemVO::getConfigKey, item -> item));
        List<CommunityConfigItemVO> previousItems = latest == null ? canonicalItems : readConfigItems(latest.getConfigSnapshot());
        Map<String, CommunityConfigItemVO> previousByKey = previousItems.stream()
                .collect(Collectors.toMap(CommunityConfigItemVO::getConfigKey, item -> item, (left, right) -> left));
        Set<String> requestKeys = new LinkedHashSet<>();
        for (CommunityConfigVersionSaveReq.Item item : req.getItems()) {
            if (!requestKeys.add(item.getConfigKey())) throw error("duplicate_config_key");
            if (!canonicalByKey.containsKey(item.getConfigKey())) throw error("unsupported_config_key");
        }
        boolean highRiskChanged = req.getItems().stream().anyMatch(item -> {
            CommunityConfigItemVO canonical = canonicalByKey.get(item.getConfigKey());
            CommunityConfigItemVO previous = previousByKey.get(item.getConfigKey());
            return Boolean.TRUE.equals(canonical.getHighRisk())
                    && !sameConfigValue(previous == null ? null : previous.getConfigValue(), item.getConfigValue());
        });
        if (highRiskChanged && !Boolean.TRUE.equals(req.getHighRiskConfirmed())) {
            throw error("high_risk_confirmation_required");
        }
        if (highRiskChanged) requireContextPermission("community:config:risk");

        Map<String, CommunityConfigItemVO> merged = previousItems.stream()
                .collect(Collectors.toMap(CommunityConfigItemVO::getConfigKey, item -> item,
                        (left, right) -> left, LinkedHashMap::new));
        for (CommunityConfigVersionSaveReq.Item item : req.getItems()) {
            CommunityConfigItemVO canonical = canonicalByKey.get(item.getConfigKey());
            CommunityConfigItemVO value = canonicalConfigItem(canonical, item.getConfigValue());
            merged.put(item.getConfigKey(), value);
            AppConfig config = new AppConfig();
            config.setConfigKey(item.getConfigKey());
            config.setConfigValue(item.getConfigValue() instanceof String stringValue ? stringValue : json(item.getConfigValue()));
            config.setConfigGroup(canonical.getConfigGroup());
            config.setConfigType(canonical.getConfigType());
            config.setPublicVisible(PUBLIC_COMMUNITY_CONFIG_KEYS.contains(item.getConfigKey()) ? 1 : 0);
            config.setStatus(CommonStatusEnum.ENABLED.getCode());
            config.setRemark(canonical.getDescription());
            appConfigDao.upsert(config);
        }
        List<CommunityConfigItemVO> values = new ArrayList<>(merged.values());
        CommunityConfigVersion entity = new CommunityConfigVersion();
        entity.setVersion(current + 1);
        entity.setVersionNo("community-v" + (current + 1));
        entity.setConfigSnapshot(json(values));
        entity.setChangeSummary(req.getChangeSummary());
        entity.setHighRiskConfirmed(highRiskChanged && Boolean.TRUE.equals(req.getHighRiskConfirmed()) ? 1 : 0);
        entity.setOperatorId(currentUserId());
        communityExtensionDao.insertConfigVersion(entity);
        writeAudit("config", entity.getVersionNo(), entity.getId(), "save", latest == null ? null : latest.getConfigSnapshot(), entity.getConfigSnapshot(), req.getChangeSummary());
        return toConfigVersionVO(entity, values);
    }

    @Override
    public List<CommunityAuditLogVO> getConfigLogs() {
        return communityExtensionDao.selectAudits(new LambdaQueryWrapper<CommunityAuditRecord>()
                        .eq(CommunityAuditRecord::getBizType, "config").orderByDesc(CommunityAuditRecord::getCreateTime))
                .stream().map(this::toAuditLogVO).toList();
    }

    /**
     * 分页查询动态列表，支持按作者、类型、状态、审核状态、话题、关键词筛选
     * @param req 动态分页查询请求
     * @return 动态分页数据
     */
    @Override
    public Page<CommunityPostAdminVO> getPostPage(CommunityPostPageReq req) {
        Long authorId = req.getUserId() != null ? req.getUserId() : req.getAuthorId();
        String postType = "moments".equalsIgnoreCase(req.getScope())
                ? CommunityPostTypeEnum.COMMUNITY.getCode()
                : StrUtil.blankToDefault(req.getContentType(), req.getPostType());
        LambdaQueryWrapper<CommunityPost> wrapper = new LambdaQueryWrapper<CommunityPost>()
                .eq(authorId != null, CommunityPost::getAuthorId, authorId)
                .eq(StrUtil.isNotBlank(postType), CommunityPost::getPostType, postType)
                .eq(StrUtil.isNotBlank(req.getSourceScene()), CommunityPost::getSourceScene, req.getSourceScene())
                .eq(StrUtil.isNotBlank(req.getStatus()), CommunityPost::getStatus, req.getStatus())
                .eq(StrUtil.isNotBlank(req.getAuditStatus()), CommunityPost::getAuditStatus, req.getAuditStatus())
                .eq(StrUtil.isNotBlank(req.getMachineResult()), CommunityPost::getMachineResult, req.getMachineResult())
                .eq(req.getTopicId() != null, CommunityPost::getTopicId, req.getTopicId())
                .and("text".equalsIgnoreCase(req.getMediaType()), item -> item
                        .isNull(CommunityPost::getImageUrls).or().eq(CommunityPost::getImageUrls, "")
                        .or().eq(CommunityPost::getImageUrls, "[]"))
                .and("image".equalsIgnoreCase(req.getMediaType()), item -> item
                        .isNotNull(CommunityPost::getImageUrls).ne(CommunityPost::getImageUrls, "")
                        .ne(CommunityPost::getImageUrls, "[]"))
                .apply(StrUtil.isNotBlank(req.getDistributionScene()),
                        "JSON_CONTAINS(distribution_scenes, JSON_QUOTE({0}))", req.getDistributionScene())
                .gt(Boolean.TRUE.equals(req.getReported()), CommunityPost::getReportCount, 0)
                .and(Boolean.FALSE.equals(req.getReported()), item -> item
                        .eq(CommunityPost::getReportCount, 0).or().isNull(CommunityPost::getReportCount))
                .ge(req.getStartTime() != null, CommunityPost::getCreateTime,
                        req.getStartTime() == null ? null : req.getStartTime().atStartOfDay())
                .lt(req.getEndTime() != null, CommunityPost::getCreateTime,
                        req.getEndTime() == null ? null : req.getEndTime().plusDays(1).atStartOfDay())
                .and(StrUtil.isNotBlank(req.getKeyword()), w -> w.like(CommunityPost::getPostNo, req.getKeyword())
                        .or().like(CommunityPost::getTitle, req.getKeyword())
                        .or().like(CommunityPost::getContent, req.getKeyword()))
                .orderByDesc(CommunityPost::getUpdateTime);
        Page<CommunityPost> page = communityPostDao.selectPage(new Page<>(req.getPage(), req.getSize()), wrapper);
        Page<CommunityPostAdminVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(toPostAdminVOs(page.getRecords()));
        return result;
    }

    /**
     * 查询动态详情（含作者信息）
     * @param id 动态ID
     * @return 动态详情
     */
    @Override
    public CommunityPostAdminVO getPostDetail(Long id) {
        return toPostAdminVO(requirePost(id));
    }

    /**
     * 审核动态（通过/驳回），审核通过后状态变为已发布，驳回后变为已拒绝
     * @param id 动态ID
     * @param req 审核请求
     */
    @Override
    @Transactional
    public void auditPost(Long id, CommunityPostAuditReq req) {
        CommunityPost post = requirePost(id);
        CommunityAuditStatusEnum auditStatus = CommunityAuditStatusEnum.getByCode(req.getAuditStatus());
        if (auditStatus == null) {
            throw error("unsupported_audit_status");
        }
        // 设置审核信息
        post.setAuditStatus(auditStatus.getCode());
        post.setAuditRemark(StrUtil.blankToDefault(StrUtil.trim(req.getAuditRemark()), null));
        // 根据审核结果更新发布状态：通过→已发布，驳回→已拒绝
        post.setStatus(CommunityAuditStatusEnum.APPROVED.equals(auditStatus)
                ? CommunityPostStatusEnum.PUBLISHED.getCode()
                : CommunityPostStatusEnum.REJECTED.getCode());
        communityPostDao.updateById(post);
        // 记录操作日志
        writeLog("COMMUNITY_POST", post.getId(), "AUDIT", null, auditStatus.getCode());
        log.info("Community post audited: postId={}, auditStatus={}", id, auditStatus.getCode());
    }

    /**
     * 分页查询评论列表，支持按动态、作者、状态、审核状态、关键词筛选
     * @param req 评论分页查询请求
     * @return 评论分页数据
     */
    @Override
    public Page<CommunityCommentAdminVO> getCommentPage(CommunityCommentPageReq req) {
        List<Long> matchedPostIds = null;
        if (StrUtil.isNotBlank(req.getPostNo())) {
            matchedPostIds = communityPostDao.selectList(new LambdaQueryWrapper<CommunityPost>()
                            .like(CommunityPost::getPostNo, StrUtil.trim(req.getPostNo())))
                    .stream().map(CommunityPost::getId).filter(Objects::nonNull).distinct().toList();
            if (matchedPostIds.isEmpty()) {
                Page<CommunityCommentAdminVO> empty = new Page<>(req.getPage(), req.getSize(), 0);
                empty.setRecords(List.of());
                return empty;
            }
        }
        Long authorId = req.getUserId() != null ? req.getUserId() : req.getAuthorId();
        LambdaQueryWrapper<CommunityComment> wrapper = new LambdaQueryWrapper<CommunityComment>()
                .eq(req.getPostId() != null, CommunityComment::getPostId, req.getPostId())
                .in(matchedPostIds != null, CommunityComment::getPostId, matchedPostIds == null ? List.of() : matchedPostIds)
                .eq(authorId != null, CommunityComment::getAuthorId, authorId)
                .eq(StrUtil.isNotBlank(req.getStatus()), CommunityComment::getStatus, req.getStatus())
                .eq(StrUtil.isNotBlank(req.getAuditStatus()), CommunityComment::getAuditStatus, req.getAuditStatus())
                .and(StrUtil.isNotBlank(req.getKeyword()), item -> item
                        .like(CommunityComment::getCommentNo, StrUtil.trim(req.getKeyword()))
                        .or().like(CommunityComment::getContent, StrUtil.trim(req.getKeyword())))
                .gt(Boolean.TRUE.equals(req.getReported()), CommunityComment::getReportCount, 0)
                .and(Boolean.FALSE.equals(req.getReported()), item -> item
                        .eq(CommunityComment::getReportCount, 0)
                        .or().isNull(CommunityComment::getReportCount))
                .ge(req.getStartTime() != null, CommunityComment::getCreateTime,
                        req.getStartTime() == null ? null : req.getStartTime().atStartOfDay())
                .lt(req.getEndTime() != null, CommunityComment::getCreateTime,
                        req.getEndTime() == null ? null : req.getEndTime().plusDays(1).atStartOfDay())
                .orderByDesc(CommunityComment::getUpdateTime);
        Page<CommunityComment> page = communityCommentDao.selectPage(new Page<>(req.getPage(), req.getSize()), wrapper);
        Page<CommunityCommentAdminVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(toCommentAdminVOs(page.getRecords()));
        return result;
    }

    /**
     * 审核评论（通过/驳回），审核通过后状态变为已发布，驳回后变为已拒绝
     * @param id 评论ID
     * @param req 审核请求
     */
    @Override
    @Transactional
    public void auditComment(Long id, CommunityCommentAuditReq req) {
        CommunityComment comment = requireComment(id);
        CommunityAuditStatusEnum auditStatus = CommunityAuditStatusEnum.getByCode(req.getAuditStatus());
        if (auditStatus == null) {
            throw error("unsupported_audit_status");
        }
        // 设置审核信息
        comment.setAuditStatus(auditStatus.getCode());
        comment.setAuditRemark(StrUtil.blankToDefault(StrUtil.trim(req.getAuditRemark()), null));
        // 根据审核结果更新发布状态：通过→已发布，驳回→已拒绝
        comment.setStatus(CommunityAuditStatusEnum.APPROVED.equals(auditStatus)
                ? CommunityPostStatusEnum.PUBLISHED.getCode()
                : CommunityPostStatusEnum.REJECTED.getCode());
        communityCommentDao.updateById(comment);
        // 记录操作日志
        writeLog("COMMUNITY_COMMENT", comment.getId(), "AUDIT", null, auditStatus.getCode());
        log.info("Community comment audited: commentId={}, auditStatus={}", id, auditStatus.getCode());
    }

    /**
     * 分页查询举报列表，支持按举报人、目标类型、状态、原因类别筛选
     * @param req 举报分页查询请求
     * @return 举报分页数据
     */
    @Override
    public Page<CommunityReportAdminVO> getReportPage(CommunityReportPageReq req) {
        Set<Long> keywordUserIds = new LinkedHashSet<>();
        if (StrUtil.isNotBlank(req.getKeyword())) {
            String keyword = StrUtil.trim(req.getKeyword());
            if (keyword.chars().allMatch(Character::isDigit)) keywordUserIds.add(Long.parseLong(keyword));
            keywordUserIds.addAll(appUserDao.selectList(new LambdaQueryWrapper<AppUser>()
                            .like(AppUser::getNickname, keyword))
                    .stream().map(AppUser::getId).filter(Objects::nonNull).toList());
        }
        LambdaQueryWrapper<CommunityReport> wrapper = new LambdaQueryWrapper<CommunityReport>()
                .eq(req.getReporterId() != null, CommunityReport::getReporterId, req.getReporterId())
                .eq(StrUtil.isNotBlank(req.getTargetType()), CommunityReport::getTargetType, req.getTargetType())
                .eq(StrUtil.isNotBlank(req.getStatus()), CommunityReport::getStatus, req.getStatus())
                .eq(StrUtil.isNotBlank(req.getReasonCode()), CommunityReport::getReasonCode, req.getReasonCode())
                .and(StrUtil.isNotBlank(req.getKeyword()), item -> {
                    String keyword = StrUtil.trim(req.getKeyword());
                    item.like(CommunityReport::getReportNo, keyword)
                            .or().like(CommunityReport::getTargetId, keyword)
                            .or().like(CommunityReport::getExtraText, keyword);
                    if (!keywordUserIds.isEmpty()) item.or().in(CommunityReport::getReporterId, keywordUserIds);
                })
                .ge(req.getStartTime() != null, CommunityReport::getCreateTime,
                        req.getStartTime() == null ? null : req.getStartTime().atStartOfDay())
                .lt(req.getEndTime() != null, CommunityReport::getCreateTime,
                        req.getEndTime() == null ? null : req.getEndTime().plusDays(1).atStartOfDay())
                .orderByDesc(CommunityReport::getUpdateTime);
        Page<CommunityReport> page = communityReportDao.selectPage(new Page<>(req.getPage(), req.getSize()), wrapper);
        Page<CommunityReportAdminVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(toReportAdminVOs(page.getRecords()));
        return result;
    }

    /**
     * 处理举报：校验状态 → 设置处理信息 → 执行处理动作 → 更新举报单 → 记录日志
     * @param id 举报ID
     * @param req 举报处理请求
     */
    @Override
    @Transactional
    public void handleReport(Long id, CommunityReportHandleReq req) {
        // 1. 校验状态：幂等性保护，仅待处理状态的举报单可处理
        CommunityReport report = requireReport(id);
        if (!CommunityReportStatusEnum.PENDING.getCode().equals(report.getStatus())) {
            throw error("report_already_handled");
        }
        CommunityReportStatusEnum status = CommunityReportStatusEnum.getByCode(req.getStatus());
        if (status == null) {
            throw error("unsupported_report_status");
        }

        // 2. 设置处理信息
        report.setStatus(status.getCode());
        report.setHandleAction(StrUtil.blankToDefault(StrUtil.trim(req.getHandleAction()), null));
        report.setHandleRemark(StrUtil.blankToDefault(StrUtil.trim(req.getHandleRemark()), null));
        report.setHandlerId(UserContextHolder.get() != null ? UserContextHolder.get().getId() : null);

        // 3. 执行处理动作：已解决且有处理动作时，对目标内容执行对应操作
        if (CommunityReportStatusEnum.VALID.equals(status)
                && StrUtil.isNotBlank(req.getHandleAction())) {
            applyHandleAction(report.getTargetType(), report.getTargetId(), req.getHandleAction());
        }

        // 4. 更新举报单
        communityReportDao.updateById(report);

        // 5. 记录日志
        writeLog("COMMUNITY_REPORT", report.getId(), "HANDLE", null, status.getCode());
        log.info("Community report handled: reportId={}, status={}, handleAction={}", id, status.getCode(), req.getHandleAction());
    }

    /**
     * 查询社区配置列表（互动准入、内容规则、审核与治理等 13 项配置）
     * @return 配置列表
     */
    @Override
    public List<AppConfigVO> getCommunityConfigs() {
        Map<String, AppConfig> configMap = appConfigDao.selectByKeys(List.of(
                CommunityConfigKeys.INTERACTION_GATE_MODE,
                CommunityConfigKeys.POST_MAX_IMAGES,
                CommunityConfigKeys.POST_MAX_TEXT_LENGTH,
                CommunityConfigKeys.POST_MAX_MENTIONS,
                CommunityConfigKeys.SINCERE_POST_MIN_TEXT_LENGTH,
                CommunityConfigKeys.CONTACT_INFO_ALLOWED,
                CommunityConfigKeys.REPORT_ENTRY_ENABLED,
                CommunityConfigKeys.MACHINE_AUDIT_ENABLED,
                CommunityConfigKeys.MANUAL_SAMPLE_RATE,
                CommunityConfigKeys.MUTE_PERIOD_OPTIONS,
                CommunityConfigKeys.IP_BLOCK_ENABLED,
                CommunityConfigKeys.IP_BLOCK_PERIOD_OPTIONS,
                CommunityConfigKeys.IP_BLOCK_WRITE_SCOPE
        )).stream().collect(Collectors.toMap(AppConfig::getConfigKey, item -> item, (a, b) -> a));

        return List.of(
                toConfigVO(configMap, CommunityConfigKeys.INTERACTION_GATE_MODE, ConfigTypeEnum.TEXT.getCode(), null, "COMMUNITY", message("config_name_interaction_gate")),
                toConfigVO(configMap, CommunityConfigKeys.POST_MAX_IMAGES, ConfigTypeEnum.NUMBER.getCode(), null, "COMMUNITY", message("config_name_post_max_images")),
                toConfigVO(configMap, CommunityConfigKeys.POST_MAX_TEXT_LENGTH, ConfigTypeEnum.NUMBER.getCode(), null, "COMMUNITY", message("config_name_post_max_text")),
                toConfigVO(configMap, CommunityConfigKeys.POST_MAX_MENTIONS, ConfigTypeEnum.NUMBER.getCode(), null, "COMMUNITY", message("config_name_post_max_mentions")),
                toConfigVO(configMap, CommunityConfigKeys.SINCERE_POST_MIN_TEXT_LENGTH, ConfigTypeEnum.NUMBER.getCode(), null, "COMMUNITY", message("config_name_sincere_min_text")),
                toConfigVO(configMap, CommunityConfigKeys.CONTACT_INFO_ALLOWED, ConfigTypeEnum.BOOLEAN.getCode(), null, "COMMUNITY", message("config_name_contact_allowed")),
                toConfigVO(configMap, CommunityConfigKeys.REPORT_ENTRY_ENABLED, ConfigTypeEnum.BOOLEAN.getCode(), null, "COMMUNITY", message("config_name_report_entry")),
                toConfigVO(configMap, CommunityConfigKeys.MACHINE_AUDIT_ENABLED, ConfigTypeEnum.BOOLEAN.getCode(), null, "COMMUNITY", message("config_name_machine_audit")),
                toConfigVO(configMap, CommunityConfigKeys.MANUAL_SAMPLE_RATE, ConfigTypeEnum.NUMBER.getCode(), null, "COMMUNITY", message("config_name_manual_sample_rate")),
                toConfigVO(configMap, CommunityConfigKeys.MUTE_PERIOD_OPTIONS, ConfigTypeEnum.JSON.getCode(), null, "COMMUNITY", message("config_name_mute_period_options")),
                toConfigVO(configMap, CommunityConfigKeys.IP_BLOCK_ENABLED, ConfigTypeEnum.BOOLEAN.getCode(), null, "COMMUNITY", message("config_name_ip_block_enabled")),
                toConfigVO(configMap, CommunityConfigKeys.IP_BLOCK_PERIOD_OPTIONS, ConfigTypeEnum.JSON.getCode(), null, "COMMUNITY", message("config_name_ip_block_period_options")),
                toConfigVO(configMap, CommunityConfigKeys.IP_BLOCK_WRITE_SCOPE, ConfigTypeEnum.JSON.getCode(), null, "COMMUNITY", message("config_name_ip_block_write_scope"))
        );
    }

    /**
     * 批量保存社区配置（逐一 upsert）
     * @param req 配置批量保存请求
     */
    @Override
    @Transactional
    public void saveCommunityConfigs(AppConfigBatchReq req) {
        // 1. 逐一 upsert 每项配置
        for (AppConfigBatchReq.AppConfigItem item : req.getItems()) {
            AppConfig entity = new AppConfig();
            entity.setConfigKey(item.getConfigKey());
            entity.setConfigValue(item.getConfigValue());
            entity.setConfigGroup(item.getConfigGroup());
            entity.setConfigType(item.getConfigType());
            entity.setPublicVisible(item.getPublicVisible());
            entity.setStatus(item.getStatus());
            entity.setRemark(item.getRemark());
            appConfigDao.upsert(entity);
        }
        // 2. 记录操作日志
        writeLog("COMMUNITY_CONFIG", null, "BATCH_SAVE", null, String.valueOf(req.getItems().size()));
        log.info("Community configs saved: itemCount={}", req.getItems().size());
    }

    /**
     * 查询社区首页Tab配置（基于 COMMUNITY_HOME_TAB 页面编码）
     * @return 移动端入口配置列表
     */
    @Override
    public List<MobileEntryConfigVO> getHomeTabs() {
        return mobileEntryConfigDao.selectByPageCode(MobilePageCodeEnum.COMMUNITY_HOME_TAB.getCode())
                .stream().map(this::toMobileEntryVO).toList();
    }

    /**
     * 根据处理动作代码对目标内容执行对应操作
     * @param targetType 举报目标类型（动态/评论）
     * @param targetId 目标ID
     * @param actionCode 处理动作代码
     */
    private void applyHandleAction(String targetType, String targetId, String actionCode) {
        CommunityReportHandleActionEnum action = CommunityReportHandleActionEnum.getByCode(actionCode);
        if (action == null) {
            throw error("unsupported_handle_action");
        }
        // BLOCK_POST：下架动态，校验目标类型必须为动态
        if (CommunityReportHandleActionEnum.BLOCK_POST.equals(action)) {
            if (!CommunityReportTargetTypeEnum.POST.getCode().equals(targetType)) {
                throw error("report_target_not_post");
            }
            CommunityPost post = requirePostRef(targetId);
            post.setStatus(CommunityPostStatusEnum.BLOCKED.getCode());
            communityPostDao.updateById(post);
            log.info("Community post blocked: postId={}", targetId);
            return;
        }
        // BLOCK_COMMENT：屏蔽评论，校验目标类型必须为评论
        if (CommunityReportHandleActionEnum.BLOCK_COMMENT.equals(action)) {
            if (!CommunityReportTargetTypeEnum.COMMENT.getCode().equals(targetType)) {
                throw error("report_target_not_comment");
            }
            CommunityComment comment = requireCommentRef(targetId);
            comment.setStatus(CommunityPostStatusEnum.BLOCKED.getCode());
            communityCommentDao.updateById(comment);
            log.info("Community comment blocked: commentId={}", targetId);
            return;
        }
        // DISMISS：驳回举报无需操作目标内容
        if (CommunityReportHandleActionEnum.NONE.equals(action)) {
            log.info("Community report dismissed: targetType={}, targetId={}", targetType, targetId);
            return;
        }
        // WARN_USER：警告用户，当前阶段仅记录，不操作目标内容（通知系统将在 PRD-03 落地后接入）
        if (CommunityReportHandleActionEnum.WARN_USER.equals(action)) {
            log.info("Community user warned: targetType={}, targetId={}", targetType, targetId);
            return;
        }
        throw error("unsupported_action_target");
    }

    private void putOptions(CommunityAdminMetaVO vo, String key, String dictType) {
        List<CommunityMetaOptionVO> options = dictDataDao.selectByDictType(dictType).stream()
                .filter(item -> CommonStatusEnum.ENABLED.getCode().equalsIgnoreCase(item.getStatus()))
                .sorted(Comparator.comparing(SysDictData::getDictSort, Comparator.nullsLast(Integer::compareTo)))
                .map(item -> {
                    CommunityMetaOptionVO option = new CommunityMetaOptionVO();
                    option.setCode(item.getDictValue());
                    option.setLabel(item.getDictLabel());
                    option.setTone(resolveTone(item.getDictValue()));
                    option.setDisabled(false);
                    option.setDescription(item.getRemark());
                    option.setExtra(parseOptionExtra(item.getRemark()));
                    return option;
                }).toList();
        vo.getOptions().put(key, options);
    }

    private Map<String, Object> parseOptionExtra(String remark) {
        if (StrUtil.isBlank(remark) || !remark.trim().startsWith("{")) return null;
        try {
            return objectMapper.readValue(remark, new TypeReference<>() {});
        } catch (Exception ignored) {
            return null;
        }
    }

    private String resolveTone(String code) {
        if (code == null) return "default";
        String value = code.toLowerCase(Locale.ROOT);
        if (Set.of("published", "enabled", "valid", "approved", "yes").contains(value)) return "success";
        if (value.startsWith("pending") || Set.of("processing", "review").contains(value)) return "warning";
        if (Set.of("blocked", "rejected", "disabled", "freeze_user", "ip_block").contains(value)) return "danger";
        if (Set.of("merged", "draft", "recommended").contains(value)) return "info";
        return "default";
    }

    private CommunityStatsVO stats(List<CommunityStatsVO.Card> cards) {
        CommunityStatsVO vo = new CommunityStatsVO();
        vo.setCards(cards);
        return vo;
    }

    private CommunityStatsVO.Card stat(String code, String label, Object value, String tone) {
        return new CommunityStatsVO.Card(code, label, value, tone);
    }

    private long countStatus(List<CommunityPost> values, String... statuses) {
        Set<String> expected = Set.of(statuses);
        return values.stream().filter(item -> expected.contains(item.getStatus())).count();
    }

    private long countCommentStatus(List<CommunityComment> values, String... statuses) {
        Set<String> expected = Set.of(statuses);
        return values.stream().filter(item -> expected.contains(item.getStatus())).count();
    }

    private long countReportStatus(List<CommunityReport> values, String... statuses) {
        Set<String> expected = Set.of(statuses);
        return values.stream().filter(item -> expected.contains(item.getStatus())).count();
    }

    /** 读取动态文案；缺失时返回稳定键，禁止退回硬编码展示文案。 */
    private String message(String key, Object... args) {
        AppConfig config = appConfigDao.selectByKey(CommunityConfigKeys.COPY_PREFIX + key);
        String template = config != null && StrUtil.isNotBlank(config.getConfigValue()) ? config.getConfigValue() : key;
        if (args == null || args.length == 0) return template;
        try {
            return String.format(Locale.ROOT, template, args);
        } catch (RuntimeException ignored) {
            return key;
        }
    }

    private BusinessException error(String key) {
        return new BusinessException(message(key));
    }

    private String resolveContentAction(String action, boolean comment) {
        if (StrUtil.isBlank(action)) throw error("handle_action_required");
        String value = action.toLowerCase(Locale.ROOT);
        if (Set.of("publish", "published", "approve", "restore").contains(value)) return CommunityPostStatusEnum.PUBLISHED.getCode();
        if (Set.of("reject", "rejected").contains(value)) return CommunityPostStatusEnum.REJECTED.getCode();
        if (Set.of("block", "blocked", "block_content", "block_comment").contains(value)) return CommunityPostStatusEnum.BLOCKED.getCode();
        if (!comment && "pending_manual".equals(value)) return CommunityPostStatusEnum.PENDING_MANUAL.getCode();
        throw error("unsupported_handle_action");
    }

    private void validateContentTransition(String currentStatus, String targetStatus,
                                           boolean comment, boolean deletedByUser) {
        String current = StrUtil.blankToDefault(currentStatus, "").toLowerCase(Locale.ROOT);
        String target = StrUtil.blankToDefault(targetStatus, "").toLowerCase(Locale.ROOT);
        if (deletedByUser || CommunityPostStatusEnum.DELETED.getCode().equals(current) || current.equals(target)) {
            throw error("invalid_status_transition");
        }
        Map<String, Set<String>> allowed = comment ? Map.of(
                CommunityPostStatusEnum.PENDING.getCode(), Set.of(
                        CommunityPostStatusEnum.PUBLISHED.getCode(),
                        CommunityPostStatusEnum.REJECTED.getCode(),
                        CommunityPostStatusEnum.BLOCKED.getCode()),
                CommunityPostStatusEnum.PUBLISHED.getCode(), Set.of(
                        CommunityPostStatusEnum.BLOCKED.getCode(),
                        CommunityPostStatusEnum.REJECTED.getCode()),
                CommunityPostStatusEnum.BLOCKED.getCode(), Set.of(CommunityPostStatusEnum.PUBLISHED.getCode())
        ) : Map.of(
                CommunityPostStatusEnum.DRAFT.getCode(), Set.of(CommunityPostStatusEnum.PENDING_MANUAL.getCode()),
                CommunityPostStatusEnum.PENDING.getCode(), Set.of(
                        CommunityPostStatusEnum.PENDING_MANUAL.getCode(),
                        CommunityPostStatusEnum.PUBLISHED.getCode(),
                        CommunityPostStatusEnum.REJECTED.getCode()),
                CommunityPostStatusEnum.PENDING_MANUAL.getCode(), Set.of(
                        CommunityPostStatusEnum.PUBLISHED.getCode(),
                        CommunityPostStatusEnum.REJECTED.getCode(),
                        CommunityPostStatusEnum.BLOCKED.getCode()),
                CommunityPostStatusEnum.PUBLISHED.getCode(), Set.of(CommunityPostStatusEnum.BLOCKED.getCode()),
                CommunityPostStatusEnum.BLOCKED.getCode(), Set.of(CommunityPostStatusEnum.PUBLISHED.getCode())
        );
        if (!allowed.getOrDefault(current, Set.of()).contains(target)) {
            throw error("invalid_status_transition");
        }
    }

    private void applyAuditStatus(CommunityPost entity, String targetStatus) {
        if (CommunityPostStatusEnum.PUBLISHED.getCode().equals(targetStatus)) {
            entity.setAuditStatus(CommunityAuditStatusEnum.APPROVED.getCode());
            if (entity.getPublishedAt() == null) entity.setPublishedAt(LocalDateTime.now());
        } else if (CommunityPostStatusEnum.REJECTED.getCode().equals(targetStatus)) {
            entity.setAuditStatus(CommunityAuditStatusEnum.REJECTED.getCode());
        } else if (CommunityPostStatusEnum.PENDING_MANUAL.getCode().equals(targetStatus)) {
            entity.setAuditStatus(CommunityAuditStatusEnum.PENDING.getCode());
        }
    }

    private void applyAuditStatus(CommunityComment entity, String targetStatus) {
        if (CommunityPostStatusEnum.PUBLISHED.getCode().equals(targetStatus)) {
            entity.setAuditStatus(CommunityAuditStatusEnum.APPROVED.getCode());
            if (entity.getPublishedAt() == null) entity.setPublishedAt(LocalDateTime.now());
        } else if (CommunityPostStatusEnum.REJECTED.getCode().equals(targetStatus)) {
            entity.setAuditStatus(CommunityAuditStatusEnum.REJECTED.getCode());
        }
    }

    private void syncPostCommentCount(Long postId, String beforeStatus, String afterStatus) {
        boolean wasPublished = CommunityPostStatusEnum.PUBLISHED.getCode().equals(beforeStatus);
        boolean isPublished = CommunityPostStatusEnum.PUBLISHED.getCode().equals(afterStatus);
        if (postId == null || wasPublished == isPublished) return;
        CommunityPost post = communityPostDao.selectById(postId);
        if (post == null) return;
        int current = Optional.ofNullable(post.getCommentCount()).orElse(0);
        post.setCommentCount(Math.max(0, current + (isPublished ? 1 : -1)));
        communityPostDao.updateById(post);
    }

    private void ensureVersion(Integer actual, Integer expected) {
        if (!Objects.equals(actual == null ? 0 : actual, expected)) throw versionConflict();
    }

    private BusinessException versionConflict() {
        return error("version_conflict");
    }

    private Long currentUserId() {
        return UserContextHolder.get() == null ? null : UserContextHolder.get().getId();
    }

    private void requireContextPermission(String permission) {
        var context = UserContextHolder.get();
        boolean superAdmin = context != null && context.getRoles() != null
                && context.getRoles().stream().anyMatch(role -> "super_admin".equalsIgnoreCase(role));
        boolean granted = context != null && context.getPermissions() != null
                && (context.getPermissions().contains(permission)
                || context.getPermissions().contains("*:*:*")
                || context.getPermissions().contains("*"));
        if (!superAdmin && !granted) throw new ForbiddenException(message("high_risk_permission_denied"));
    }

    private String userNo(AppUser user, Long id) {
        if (user != null && StrUtil.isNotBlank(user.getAnonymousNo())) return user.getAnonymousNo();
        return id == null ? null : "USR-" + String.format(Locale.ROOT, "%012d", id);
    }

    private void mergeReport(CommunityReport report, String targetReportNo) {
        if (StrUtil.isBlank(targetReportNo)) throw error("merge_report_no_required");
        List<CommunityReport> values = communityReportDao.selectList(new LambdaQueryWrapper<CommunityReport>()
                .eq(CommunityReport::getReportNo, targetReportNo).last("LIMIT 1"));
        if (values == null || values.isEmpty() || Objects.equals(values.get(0).getId(), report.getId())) {
            throw error("merge_report_not_found");
        }
        report.setMergedToReportId(values.get(0).getId());
    }

    private void applyPunishment(CommunityReport report, CommunityReportStatusReq req) {
        CommunityReportHandleActionEnum action = CommunityReportHandleActionEnum.getByCode(req.getPunishAction());
        if (action == null) throw error("punish_action_required");
        if (action == CommunityReportHandleActionEnum.BLOCK_POST || action == CommunityReportHandleActionEnum.BLOCK_COMMENT) {
            applyHandleAction(report.getTargetType(), report.getTargetId(), action.getCode());
            return;
        }
        if (action == CommunityReportHandleActionEnum.NONE) return;
        if (action == CommunityReportHandleActionEnum.WARN_USER) {
            if (report.getTargetUserId() == null) throw error("trusted_target_user_required");
            writeModerationResult("report", report.getReportNo(), report.getVersion() + 1,
                    report.getTargetUserId(), "warn_user", req.getHandleRemark());
            return;
        }
        if (Set.of(CommunityReportHandleActionEnum.MUTE_USER,
                CommunityReportHandleActionEnum.IP_BLOCK,
                CommunityReportHandleActionEnum.FREEZE_USER).contains(action)) {
            requireContextPermission("community:report:risk");
        }
        if (report.getTargetUserId() == null && action != CommunityReportHandleActionEnum.IP_BLOCK) {
            throw error("trusted_target_user_required");
        }
        if (action == CommunityReportHandleActionEnum.MUTE_USER) {
            CommunityUserRestriction restriction = new CommunityUserRestriction();
            restriction.setUserId(report.getTargetUserId());
            restriction.setRestrictionType("mute");
            restriction.setReason(req.getHandleRemark());
            restriction.setStartTime(LocalDateTime.now());
            restriction.setEndTime(resolveUntil(req.getMutePeriod()));
            restriction.setStatus("active");
            restriction.setActiveMarker(1);
            restriction.setSourceReportId(report.getId());
            restriction.setVersion(0);
            communityExtensionDao.insertRestriction(restriction);
            report.setPunishmentUntil(restriction.getEndTime());
        } else if (action == CommunityReportHandleActionEnum.IP_BLOCK) {
            if (StrUtil.isBlank(req.getRiskIp())) throw error("risk_ip_required");
            CommunityIpBlock block = new CommunityIpBlock();
            block.setIpValue(req.getRiskIp());
            block.setWriteScope(json(req.getIpBlockScopes() == null ? List.of() : req.getIpBlockScopes()));
            block.setReason(req.getHandleRemark());
            block.setStartTime(LocalDateTime.now());
            block.setEndTime(resolveUntil(req.getIpBlockPeriod()));
            block.setStatus("active");
            block.setActiveMarker(1);
            block.setSourceReportId(report.getId());
            block.setVersion(0);
            communityExtensionDao.insertIpBlock(block);
        } else if (action == CommunityReportHandleActionEnum.FREEZE_USER) {
            appUserAdminService.updateUserStatus(report.getTargetUserId(), AccountStatusEnum.FROZEN.getCode());
        }
    }

    private LocalDateTime resolveUntil(String code) {
        if (StrUtil.isBlank(code)) throw error("punish_period_required");
        return switch (code.toLowerCase(Locale.ROOT)) {
            case "1h" -> LocalDateTime.now().plusHours(1);
            case "24h", "1d" -> LocalDateTime.now().plusDays(1);
            case "3d", "72h" -> LocalDateTime.now().plusDays(3);
            case "7d" -> LocalDateTime.now().plusDays(7);
            case "30d" -> LocalDateTime.now().plusDays(30);
            default -> throw error("unsupported_punish_period");
        };
    }

    private CommunityTopic requireTopic(Long id) {
        CommunityTopic topic = communityExtensionDao.selectTopicById(id);
        if (topic == null) throw error("topic_not_found");
        return topic;
    }

    private void validateTopicCover(String url) {
        if (StrUtil.isBlank(url)) throw error("topic_cover_url_invalid");
        try {
            URI uri = URI.create(url);
            if (!"https".equalsIgnoreCase(uri.getScheme())
                    || !TOPIC_COVER_HOST.equalsIgnoreCase(uri.getHost())
                    || StrUtil.isBlank(uri.getPath())) {
                throw error("topic_cover_url_invalid");
            }
        } catch (IllegalArgumentException exception) {
            throw error("topic_cover_url_invalid");
        }
    }

    private void validateTopicDisplayScenes(List<String> scenes) {
        if (scenes == null || scenes.isEmpty()
                || scenes.stream().anyMatch(scene -> !TOPIC_DISPLAY_SCENES.contains(scene))) {
            throw error("topic_display_scene_invalid");
        }
    }

    private void ensureUniqueTopicName(String topicName, Long excludeId, String status) {
        if (!"enabled".equalsIgnoreCase(status)) return;
        String normalizedName = StrUtil.trim(topicName);
        List<CommunityTopic> matches = communityExtensionDao.selectTopics(new LambdaQueryWrapper<CommunityTopic>()
                .eq(CommunityTopic::getTopicName, normalizedName)
                .eq(CommunityTopic::getStatus, "enabled")
                .ne(excludeId != null, CommunityTopic::getId, excludeId)
                .last("LIMIT 1"));
        if (matches != null && !matches.isEmpty()) throw error("topic_name_duplicate");
    }

    private void applyTopic(CommunityTopic entity, CommunityTopicSaveReq req) {
        entity.setTopicName(StrUtil.trim(req.getTopicName()));
        entity.setDescription(StrUtil.trim(req.getDescription()));
        entity.setCoverUrl(req.getCoverUrl());
        // 封面只能来自后台签发上传票据对应的项目 OSS，保存时可直接进入已通过状态。
        entity.setCoverAuditStatus("approved");
        entity.setDisplayScenes(json(req.getDisplayScenes() == null ? List.of() : req.getDisplayScenes()));
        entity.setRecommended(Boolean.TRUE.equals(req.getRecommended()) ? 1 : 0);
        entity.setSort(req.getSort());
        entity.setStatus(req.getStatus());
    }

    private List<CommunityTopicAdminVO> toTopicAdminVOs(List<CommunityTopic> entities) {
        if (entities == null || entities.isEmpty()) return List.of();
        List<Long> topicIds = entities.stream().map(CommunityTopic::getId)
                .filter(Objects::nonNull).distinct().toList();
        Map<Long, List<CommunityPost>> postsByTopic = topicIds.isEmpty() ? Map.of() : communityPostDao
                .selectList(new LambdaQueryWrapper<CommunityPost>().in(CommunityPost::getTopicId, topicIds))
                .stream().filter(item -> item.getTopicId() != null)
                .collect(Collectors.groupingBy(CommunityPost::getTopicId));
        Map<String, String> statusLabels = resolveDictLabels("community_topic_status");
        return entities.stream().map(entity -> {
            List<CommunityPost> posts = postsByTopic.getOrDefault(entity.getId(), List.of());
            return toTopicAdminVO(entity, posts,
                    statusLabels.getOrDefault(entity.getStatus(), entity.getStatus()), false);
        }).toList();
    }

    private CommunityTopicAdminVO toTopicAdminVO(CommunityTopic entity, boolean withLogs) {
        List<CommunityPost> posts = communityPostDao.selectList(new LambdaQueryWrapper<CommunityPost>()
                .eq(CommunityPost::getTopicId, entity.getId()));
        return toTopicAdminVO(entity, posts,
                resolveDictLabel("community_topic_status", entity.getStatus()), withLogs);
    }

    private CommunityTopicAdminVO toTopicAdminVO(CommunityTopic entity, List<CommunityPost> posts,
                                                   String statusLabel, boolean withLogs) {
        CommunityTopicAdminVO vo = new CommunityTopicAdminVO();
        vo.setId(entity.getId());
        vo.setTopicCode(entity.getTopicCode());
        vo.setTopicName(entity.getTopicName());
        vo.setDescription(entity.getDescription());
        vo.setCoverUrl(entity.getCoverUrl());
        vo.setDisplayScenes(readStringList(entity.getDisplayScenes()));
        vo.setRecommended(Objects.equals(entity.getRecommended(), 1));
        vo.setSort(entity.getSort());
        vo.setStatus(entity.getStatus());
        vo.setStatusName(statusLabel);
        List<CommunityPost> safePosts = posts == null ? List.of() : posts;
        long contentCount = safePosts.size();
        vo.setContentCount(contentCount);
        vo.setHeatValue(safePosts.stream().mapToLong(item ->
                Optional.ofNullable(item.getLikeCount()).orElse(0)
                        + Optional.ofNullable(item.getCommentCount()).orElse(0)).sum());
        vo.setVersion(entity.getVersion() == null ? 0 : entity.getVersion());
        vo.setCreateTime(format(entity.getCreateTime()));
        vo.setUpdateTime(format(entity.getUpdateTime()));
        if (withLogs) vo.setAuditLogs(auditLogs("topic", entity.getId()));
        return vo;
    }

    private CommunityConfigVersion latestConfigVersion() {
        return communityExtensionDao.selectConfigVersionOne(new LambdaQueryWrapper<CommunityConfigVersion>()
                .orderByDesc(CommunityConfigVersion::getVersion).last("LIMIT 1"));
    }

    private List<CommunityConfigItemVO> defaultConfigItems() {
        return getCommunityConfigs().stream().map(item -> {
            CommunityConfigItemVO vo = new CommunityConfigItemVO();
            vo.setConfigKey(item.getConfigKey());
            vo.setConfigValue(item.getConfigValue());
            vo.setConfigGroup(item.getConfigGroup());
            vo.setConfigType(item.getConfigType());
            vo.setName(item.getRemark());
            vo.setDescription(item.getRemark());
            applyConfigPresentation(vo);
            vo.setEditable(true);
            return vo;
        }).toList();
    }

    private void applyConfigPresentation(CommunityConfigItemVO vo) {
        String key = vo.getConfigKey();
        if (CommunityConfigKeys.INTERACTION_GATE_MODE.equals(key)) {
            vo.setSectionCode("entry");
            vo.setOptionsKey("interactionGateMode");
            vo.setHighRisk(true);
            vo.setSort(10);
            return;
        }
        if (CommunityConfigKeys.REPORT_ENTRY_ENABLED.equals(key)) {
            vo.setSectionCode("report");
            vo.setOptionsKey("yesNo");
            vo.setHighRisk(true);
            vo.setSort(10);
            return;
        }
        if (Set.of(CommunityConfigKeys.MUTE_PERIOD_OPTIONS, CommunityConfigKeys.IP_BLOCK_ENABLED,
                CommunityConfigKeys.IP_BLOCK_PERIOD_OPTIONS, CommunityConfigKeys.IP_BLOCK_WRITE_SCOPE).contains(key)) {
            vo.setSectionCode("governance");
            vo.setOptionsKey(CommunityConfigKeys.IP_BLOCK_ENABLED.equals(key) ? "yesNo" : null);
            vo.setHighRisk(CommunityConfigKeys.IP_BLOCK_ENABLED.equals(key));
            vo.setSort(switch (key) {
                case CommunityConfigKeys.MUTE_PERIOD_OPTIONS -> 10;
                case CommunityConfigKeys.IP_BLOCK_ENABLED -> 20;
                case CommunityConfigKeys.IP_BLOCK_PERIOD_OPTIONS -> 30;
                default -> 40;
            });
            return;
        }
        vo.setSectionCode("audit");
        boolean booleanValue = Set.of(CommunityConfigKeys.CONTACT_INFO_ALLOWED,
                CommunityConfigKeys.MACHINE_AUDIT_ENABLED).contains(key);
        vo.setOptionsKey(booleanValue ? "yesNo" : null);
        vo.setHighRisk(booleanValue);
        vo.setSort(switch (key) {
            case CommunityConfigKeys.POST_MAX_IMAGES -> 10;
            case CommunityConfigKeys.POST_MAX_TEXT_LENGTH -> 20;
            case CommunityConfigKeys.POST_MAX_MENTIONS -> 30;
            case CommunityConfigKeys.SINCERE_POST_MIN_TEXT_LENGTH -> 40;
            case CommunityConfigKeys.CONTACT_INFO_ALLOWED -> 50;
            case CommunityConfigKeys.MACHINE_AUDIT_ENABLED -> 60;
            default -> 70;
        });
    }

    private List<CommunityConfigItemVO> readConfigItems(String snapshot) {
        try {
            return objectMapper.readValue(snapshot, new TypeReference<>() {});
        } catch (Exception e) {
            throw error("config_snapshot_invalid");
        }
    }

    private CommunityConfigItemVO toConfigItem(CommunityConfigVersionSaveReq.Item item) {
        CommunityConfigItemVO vo = new CommunityConfigItemVO();
        vo.setConfigKey(item.getConfigKey());
        vo.setConfigValue(item.getConfigValue());
        vo.setConfigGroup(item.getConfigGroup());
        vo.setConfigType(item.getConfigType());
        vo.setSectionCode(item.getSectionCode());
        vo.setName(item.getName());
        vo.setDescription(item.getDescription());
        vo.setHighRisk(item.getHighRisk());
        vo.setEditable(item.getEditable());
        vo.setOptionsKey(item.getOptionsKey());
        vo.setSort(item.getSort());
        return vo;
    }

    private CommunityConfigItemVO canonicalConfigItem(CommunityConfigItemVO canonical, Object value) {
        CommunityConfigItemVO vo = new CommunityConfigItemVO();
        vo.setConfigKey(canonical.getConfigKey());
        vo.setConfigValue(value);
        vo.setSectionCode(canonical.getSectionCode());
        vo.setConfigGroup(canonical.getConfigGroup());
        vo.setName(canonical.getName());
        vo.setDescription(canonical.getDescription());
        vo.setConfigType(canonical.getConfigType());
        vo.setHighRisk(canonical.getHighRisk());
        vo.setEditable(canonical.getEditable());
        vo.setOptionsKey(canonical.getOptionsKey());
        vo.setSort(canonical.getSort());
        return vo;
    }

    private boolean sameConfigValue(Object left, Object right) {
        if (Objects.equals(left, right)) return true;
        return Objects.equals(json(left), json(right));
    }

    private CommunityConfigVersionVO toConfigVersionVO(CommunityConfigVersion entity, List<CommunityConfigItemVO> items) {
        CommunityConfigVersionVO vo = new CommunityConfigVersionVO();
        vo.setVersion(entity == null ? 0 : entity.getVersion());
        vo.setVersionNo(entity == null ? null : entity.getVersionNo());
        vo.setItems(items);
        vo.setSections(items.stream().collect(Collectors.groupingBy(
                        item -> StrUtil.blankToDefault(item.getSectionCode(), "other"), LinkedHashMap::new, Collectors.toList()))
                .entrySet().stream().map(entry -> {
                    CommunityConfigSectionVO section = new CommunityConfigSectionVO();
                    section.setCode(entry.getKey());
                    section.setName(resolveDictLabel("community_config_section", entry.getKey()));
                    section.setItems(entry.getValue());
                    return section;
                }).toList());
        vo.setChangeLogs(getConfigLogs());
        vo.setInitialized(entity != null);
        return vo;
    }

    private CommunityAuditLogVO toAuditLogVO(CommunityAuditRecord entity) {
        CommunityAuditLogVO vo = new CommunityAuditLogVO();
        vo.setId(entity.getId());
        vo.setAction(entity.getAction());
        vo.setActionName(entity.getAction());
        vo.setRemark(entity.getReason());
        vo.setCreateTime(format(entity.getCreateTime()));
        if (entity.getOperatorId() != null) {
            SysUser operator = userDao.selectById(entity.getOperatorId());
            vo.setOperatorName(operator == null ? null : operator.getNickname());
        }
        return vo;
    }

    private List<CommunityAuditLogVO> auditLogs(String bizType, Long bizId) {
        return communityExtensionDao.selectAudits(new LambdaQueryWrapper<CommunityAuditRecord>()
                        .eq(CommunityAuditRecord::getBizType, bizType)
                        .eq(CommunityAuditRecord::getBizId, bizId)
                        .orderByDesc(CommunityAuditRecord::getCreateTime))
                .stream().map(this::toAuditLogVO).toList();
    }

    private void writeAudit(String bizType, String bizNo, Long bizId, String action,
                            String before, String after, String reason) {
        CommunityAuditRecord record = new CommunityAuditRecord();
        record.setBizType(bizType);
        record.setBizNo(bizNo);
        record.setBizId(bizId);
        record.setAction(StrUtil.blankToDefault(action, "update"));
        record.setResult("success");
        record.setBeforeSnapshot(before);
        record.setAfterSnapshot(after);
        record.setReason(reason);
        record.setOperatorId(currentUserId());
        communityExtensionDao.insertAudit(record);
    }

    private void writeModerationResult(String aggregateType, String aggregateNo, int aggregateVersion,
                                       Long recipientUserId, String result, String reason) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("recipientUserId", recipientUserId);
        payload.put("bizNo", aggregateNo);
        payload.put("result", result);
        payload.put("reason", reason);
        writeOutbox("moderation_result", aggregateType, aggregateNo, aggregateVersion, json(payload));
    }

    private void writeOutbox(String eventType, String aggregateType, String aggregateNo,
                             int aggregateVersion, String payload) {
        CommunityEventOutbox event = new CommunityEventOutbox();
        event.setEventNo("EVT-" + IdUtil.fastSimpleUUID().substring(0, 20).toUpperCase(Locale.ROOT));
        event.setEventType(eventType);
        event.setAggregateType(aggregateType);
        event.setAggregateNo(aggregateNo);
        event.setAggregateVersion(aggregateVersion);
        event.setPayload(payload);
        event.setStatus("pending");
        event.setRetryCount(0);
        communityExtensionDao.insertOutbox(event);
    }

    private CommunityExportTaskVO toExportVO(CommunityExportTask entity) {
        CommunityExportTaskVO vo = new CommunityExportTaskVO();
        vo.setId(entity.getId());
        vo.setTaskNo(entity.getTaskNo());
        vo.setExportType(entity.getExportType());
        vo.setStatus(entity.getStatus());
        vo.setProgress(entity.getProgress());
        vo.setFileUrl(entity.getFileUrl());
        vo.setErrorMessage(entity.getErrorMessage());
        vo.setCreateTime(format(entity.getCreateTime()));
        vo.setCompletedTime(format(entity.getCompletedAt()));
        return vo;
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            throw error("serialization_failed");
        }
    }

    private List<String> readStringList(String value) {
        if (StrUtil.isBlank(value)) return List.of();
        try {
            return objectMapper.readValue(value, new TypeReference<>() {});
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private String format(LocalDateTime time) {
        return time == null ? null : time.format(FMT);
    }

    private String maskIp(String ip) {
        if (StrUtil.isBlank(ip)) return null;
        int index = ip.lastIndexOf('.');
        return index > 0 ? ip.substring(0, index) + ".***" : "***";
    }

    private CommunityReportContextVO resolveReportContext(CommunityReport report) {
        CommunityReportContextVO vo = new CommunityReportContextVO();
        vo.setSourceNo(report.getTargetId());
        if (CommunityReportTargetTypeEnum.POST.getCode().equals(report.getTargetType())) {
            try {
                CommunityPost post = requirePostRef(report.getTargetId());
                vo.setContent(post.getContent());
                vo.setSummary(StrUtil.maxLength(post.getContent(), 100));
                vo.setImageUrls(readStringList(post.getImageUrls()));
                vo.setAvailable(true);
            } catch (BusinessException exception) {
                vo.setAvailable(false);
                vo.setUnavailableReason("content_not_found");
            }
        } else if (CommunityReportTargetTypeEnum.COMMENT.getCode().equals(report.getTargetType())) {
            try {
                CommunityComment comment = requireCommentRef(report.getTargetId());
                vo.setContent(comment.getContent());
                vo.setSummary(StrUtil.maxLength(comment.getContent(), 100));
                vo.setAvailable(true);
            } catch (BusinessException exception) {
                vo.setAvailable(false);
                vo.setUnavailableReason("comment_not_found");
            }
        } else if (CommunityReportTargetTypeEnum.CHAT.getCode().equals(report.getTargetType())) {
            vo.setConversationType(report.getSourceType());
            String evidence = StrUtil.blankToDefault(report.getEvidenceJson(), report.getContextJson());
            vo.setContent(evidence);
            vo.setSummary(StrUtil.maxLength(evidence, 100));
            vo.setAvailable(StrUtil.isNotBlank(evidence));
            if (!Boolean.TRUE.equals(vo.getAvailable())) vo.setUnavailableReason("chat_context_unavailable");
        } else {
            vo.setSummary(report.getContextJson());
            vo.setAvailable(report.getTargetUserId() != null);
        }
        return vo;
    }

    private CommunityPost requirePost(Long id) {
        CommunityPost post = communityPostDao.selectById(id);
        if (post == null) {
            throw error("content_not_found");
        }
        return post;
    }

    private CommunityComment requireComment(Long id) {
        CommunityComment comment = communityCommentDao.selectById(id);
        if (comment == null) {
            throw error("comment_not_found");
        }
        return comment;
    }

    private CommunityReport requireReport(Long id) {
        CommunityReport report = communityReportDao.selectById(id);
        if (report == null) {
            throw error("report_not_found");
        }
        return report;
    }

    private CommunityPost requirePostRef(String ref) {
        if (ref != null && ref.chars().allMatch(Character::isDigit)) return requirePost(Long.parseLong(ref));
        List<CommunityPost> values = communityPostDao.selectList(new LambdaQueryWrapper<CommunityPost>()
                .eq(CommunityPost::getPostNo, ref).last("LIMIT 1"));
        if (values == null || values.isEmpty()) throw error("content_not_found");
        return values.get(0);
    }

    private CommunityComment requireCommentRef(String ref) {
        if (ref != null && ref.chars().allMatch(Character::isDigit)) return requireComment(Long.parseLong(ref));
        List<CommunityComment> values = communityCommentDao.selectList(new LambdaQueryWrapper<CommunityComment>()
                .eq(CommunityComment::getCommentNo, ref).last("LIMIT 1"));
        if (values == null || values.isEmpty()) throw error("comment_not_found");
        return values.get(0);
    }

    private List<CommunityPostAdminVO> toPostAdminVOs(List<CommunityPost> entities) {
        if (entities == null || entities.isEmpty()) return List.of();

        List<Long> authorIds = entities.stream().map(CommunityPost::getAuthorId)
                .filter(Objects::nonNull).distinct().toList();
        Map<Long, AppUser> authors = authorIds.isEmpty() ? Map.of() : appUserDao.selectByIds(authorIds).stream()
                .collect(Collectors.toMap(AppUser::getId, item -> item, (left, right) -> left));

        List<Long> topicIds = entities.stream().map(CommunityPost::getTopicId)
                .filter(Objects::nonNull).distinct().toList();
        Map<Long, CommunityTopic> topics = topicIds.isEmpty() ? Map.of() : communityExtensionDao
                .selectTopics(new LambdaQueryWrapper<CommunityTopic>().in(CommunityTopic::getId, topicIds))
                .stream().collect(Collectors.toMap(CommunityTopic::getId, item -> item, (left, right) -> left));

        Map<String, String> statusLabels = resolveDictLabels("community_content_status");
        Map<String, String> machineLabels = resolveDictLabels("community_machine_result");
        return entities.stream().map(entity -> toPostAdminVO(
                entity,
                authors.get(entity.getAuthorId()),
                entity.getTopicId() == null ? null : topics.get(entity.getTopicId()),
                statusLabels.getOrDefault(entity.getStatus(), entity.getStatus()),
                machineLabels.getOrDefault(entity.getMachineResult(), entity.getMachineResult()),
                false
        )).toList();
    }

    private Map<String, String> resolveDictLabels(String dictType) {
        List<SysDictData> values = dictDataDao.selectList(new LambdaQueryWrapper<SysDictData>()
                .eq(SysDictData::getDictType, dictType)
                .orderByAsc(SysDictData::getDictSort)
                .orderByAsc(SysDictData::getId));
        Map<String, String> labels = new LinkedHashMap<>();
        Map<String, String> enabledLabels = new LinkedHashMap<>();
        for (SysDictData item : values) {
            if (StrUtil.isBlank(item.getDictValue())) continue;
            labels.putIfAbsent(item.getDictValue(), item.getDictLabel());
            if (CommonStatusEnum.ENABLED.getCode().equalsIgnoreCase(item.getStatus())) {
                enabledLabels.putIfAbsent(item.getDictValue(), item.getDictLabel());
            }
        }
        labels.putAll(enabledLabels);
        return labels;
    }

    private CommunityPostAdminVO toPostAdminVO(CommunityPost entity) {
        AppUser author = appUserDao.selectById(entity.getAuthorId());
        CommunityTopic topic = entity.getTopicId() == null ? null : communityExtensionDao.selectTopicById(entity.getTopicId());
        return toPostAdminVO(entity, author, topic,
                resolveDictLabel("community_content_status", entity.getStatus()),
                resolveDictLabel("community_machine_result", entity.getMachineResult()), true);
    }

    private CommunityPostAdminVO toPostAdminVO(CommunityPost entity, AppUser author, CommunityTopic topic,
                                                String statusLabel, String machineLabel, boolean includeAuditLogs) {
        CommunityPostAdminVO vo = new CommunityPostAdminVO();
        vo.setId(entity.getId());
        vo.setPostNo(entity.getPostNo());
        vo.setAuthorId(entity.getAuthorId());
        vo.setAuthorNo(userNo(author, entity.getAuthorId()));
        vo.setAuthorName(author != null ? author.getNickname() : null);
        vo.setAuthorPhone(author != null ? DesensitizeUtil.maskPhone(author.getPhone()) : null);
        vo.setPostType(entity.getPostType());
        vo.setContentType(entity.getPostType());
        vo.setSourceScene(entity.getSourceScene());
        vo.setTitle(entity.getTitle());
        vo.setContent(entity.getContent());
        vo.setContentSummary(StrUtil.maxLength(entity.getContent(), 100));
        vo.setImageUrls(readStringList(entity.getImageUrls()));
        vo.setMediaType(vo.getImageUrls().isEmpty() ? "text" : "image");
        vo.setTopicId(entity.getTopicId());
        vo.setTopicName(topic == null ? entity.getTopicNameSnapshot() : topic.getTopicName());
        vo.setTopicCode(entity.getTopicCode());
        vo.setDistributionScenes(readStringList(entity.getDistributionScenes()));
        vo.setReadCount(Optional.ofNullable(entity.getReadCount()).orElse(0));
        vo.setLikeCount(entity.getLikeCount());
        vo.setCommentCount(entity.getCommentCount());
        vo.setReportCount(entity.getReportCount());
        vo.setStatus(entity.getStatus());
        vo.setStatusName(statusLabel);
        vo.setAuditStatus(entity.getAuditStatus());
        vo.setAuditRemark(entity.getAuditRemark());
        vo.setMachineResult(entity.getMachineResult());
        vo.setMachineLabel(machineLabel);
        vo.setRiskLevel(entity.getMachineCode());
        vo.setViolationLabels(List.of());
        vo.setVersion(entity.getVersion() == null ? 0 : entity.getVersion());
        vo.setPublishedTime(format(entity.getPublishedAt()));
        vo.setHandledTime(format(entity.getHandledAt()));
        vo.setAuditLogs(includeAuditLogs ? auditLogs("post", entity.getId()) : List.of());
        vo.setCreateTime(entity.getCreateTime() != null ? entity.getCreateTime().format(FMT) : null);
        vo.setUpdateTime(entity.getUpdateTime() != null ? entity.getUpdateTime().format(FMT) : null);
        return vo;
    }

    private List<CommunityCommentAdminVO> toCommentAdminVOs(List<CommunityComment> entities) {
        if (entities == null || entities.isEmpty()) return List.of();

        List<Long> userIds = entities.stream()
                .flatMap(entity -> java.util.stream.Stream.of(entity.getAuthorId(), entity.getReplyUserId()))
                .filter(Objects::nonNull).distinct().toList();
        Map<Long, AppUser> users = userIds.isEmpty() ? Map.of() : appUserDao.selectByIds(userIds).stream()
                .collect(Collectors.toMap(AppUser::getId, item -> item, (left, right) -> left));

        List<Long> postIds = entities.stream().map(CommunityComment::getPostId)
                .filter(Objects::nonNull).distinct().toList();
        Map<Long, CommunityPost> posts = postIds.isEmpty() ? Map.of() : communityPostDao
                .selectList(new LambdaQueryWrapper<CommunityPost>().in(CommunityPost::getId, postIds))
                .stream().collect(Collectors.toMap(CommunityPost::getId, item -> item, (left, right) -> left));

        List<Long> parentIds = entities.stream().map(CommunityComment::getParentCommentId)
                .filter(Objects::nonNull).distinct().toList();
        Map<Long, CommunityComment> parents = parentIds.isEmpty() ? Map.of() : communityCommentDao
                .selectList(new LambdaQueryWrapper<CommunityComment>().in(CommunityComment::getId, parentIds))
                .stream().collect(Collectors.toMap(CommunityComment::getId, item -> item, (left, right) -> left));

        Map<String, String> commentStatusLabels = resolveDictLabels("community_comment_status");
        Map<String, String> postStatusLabels = resolveDictLabels("community_content_status");
        return entities.stream().map(entity -> toCommentAdminVO(
                entity,
                users.get(entity.getAuthorId()),
                users.get(entity.getReplyUserId()),
                posts.get(entity.getPostId()),
                parents.get(entity.getParentCommentId()),
                commentStatusLabels.getOrDefault(entity.getStatus(), entity.getStatus()),
                posts.containsKey(entity.getPostId())
                        ? postStatusLabels.getOrDefault(posts.get(entity.getPostId()).getStatus(), posts.get(entity.getPostId()).getStatus())
                        : null,
                false
        )).toList();
    }

    private CommunityCommentAdminVO toCommentAdminVO(CommunityComment entity) {
        AppUser author = appUserDao.selectById(entity.getAuthorId());
        AppUser replyUser = entity.getReplyUserId() != null ? appUserDao.selectById(entity.getReplyUserId()) : null;
        CommunityPost post = communityPostDao.selectById(entity.getPostId());
        CommunityComment parent = entity.getParentCommentId() == null ? null : communityCommentDao.selectById(entity.getParentCommentId());
        return toCommentAdminVO(entity, author, replyUser, post, parent,
                resolveDictLabel("community_comment_status", entity.getStatus()),
                post == null ? null : resolveDictLabel("community_content_status", post.getStatus()), true);
    }

    private CommunityCommentAdminVO toCommentAdminVO(CommunityComment entity, AppUser author, AppUser replyUser,
                                                       CommunityPost post, CommunityComment parent,
                                                       String statusLabel, String postStatusLabel,
                                                       boolean includeAuditLogs) {
        CommunityCommentAdminVO vo = new CommunityCommentAdminVO();
        vo.setId(entity.getId());
        vo.setCommentNo(entity.getCommentNo());
        vo.setPostId(entity.getPostId());
        vo.setPostAvailable(post != null);
        vo.setPostNo(post == null ? null : post.getPostNo());
        vo.setPostType(post == null ? null : post.getPostType());
        vo.setPostTitle(post == null ? null : post.getTitle());
        vo.setPostSummary(post == null ? null : StrUtil.maxLength(
                StrUtil.blankToDefault(post.getTitle(), post.getContent()), 80));
        vo.setPostContent(post == null ? null : post.getContent());
        vo.setPostImageUrls(post == null ? List.of() : readStringList(post.getImageUrls()));
        vo.setPostSourceScene(post == null ? null : post.getSourceScene());
        vo.setPostStatus(post == null ? null : post.getStatus());
        vo.setPostStatusName(postStatusLabel);
        vo.setAuthorId(entity.getAuthorId());
        vo.setAuthorNo(userNo(author, entity.getAuthorId()));
        vo.setAuthorName(author != null ? author.getNickname() : null);
        vo.setAuthorPhone(author != null ? DesensitizeUtil.maskPhone(author.getPhone()) : null);
        vo.setParentCommentId(entity.getParentCommentId());
        vo.setParentContent(parent == null ? null : parent.getContent());
        vo.setReplyUserId(entity.getReplyUserId());
        vo.setReplyUserName(replyUser != null ? replyUser.getNickname() : null);
        vo.setContent(entity.getContent());
        vo.setLikeCount(entity.getLikeCount());
        vo.setReportCount(entity.getReportCount());
        vo.setStatus(entity.getStatus());
        vo.setStatusName(statusLabel);
        vo.setAuditStatus(entity.getAuditStatus());
        vo.setAuditRemark(entity.getAuditRemark());
        vo.setMachineResult(entity.getMachineResult());
        vo.setVersion(entity.getVersion() == null ? 0 : entity.getVersion());
        vo.setAuditLogs(includeAuditLogs ? auditLogs("comment", entity.getId()) : List.of());
        vo.setCreateTime(entity.getCreateTime() != null ? entity.getCreateTime().format(FMT) : null);
        vo.setUpdateTime(entity.getUpdateTime() != null ? entity.getUpdateTime().format(FMT) : null);
        return vo;
    }

    private List<CommunityReportAdminVO> toReportAdminVOs(List<CommunityReport> entities) {
        if (entities == null || entities.isEmpty()) return List.of();

        List<Long> appUserIds = entities.stream()
                .flatMap(entity -> java.util.stream.Stream.of(entity.getReporterId(), entity.getTargetUserId()))
                .filter(Objects::nonNull).distinct().toList();
        Map<Long, AppUser> appUsers = appUserIds.isEmpty() ? Map.of() : appUserDao.selectByIds(appUserIds).stream()
                .collect(Collectors.toMap(AppUser::getId, item -> item, (left, right) -> left));

        List<Long> handlerIds = entities.stream().map(CommunityReport::getHandlerId)
                .filter(Objects::nonNull).distinct().toList();
        Map<Long, SysUser> handlers = handlerIds.isEmpty() ? Map.of() : userDao.selectByIds(handlerIds).stream()
                .collect(Collectors.toMap(SysUser::getId, item -> item, (left, right) -> left));

        List<Long> mergedIds = entities.stream().map(CommunityReport::getMergedToReportId)
                .filter(Objects::nonNull).distinct().toList();
        Map<Long, String> mergedReportNos = mergedIds.isEmpty() ? Map.of() : communityReportDao
                .selectList(new LambdaQueryWrapper<CommunityReport>().in(CommunityReport::getId, mergedIds))
                .stream().collect(Collectors.toMap(CommunityReport::getId, CommunityReport::getReportNo,
                        (left, right) -> left));

        Map<String, String> reasonLabels = resolveDictLabels("community_report_reason");
        Map<String, String> statusLabels = resolveDictLabels("community_report_status");
        return entities.stream().map(entity -> toReportAdminVO(
                entity,
                appUsers.get(entity.getReporterId()),
                entity.getTargetUserId() == null ? null : appUsers.get(entity.getTargetUserId()),
                entity.getHandlerId() == null ? null : handlers.get(entity.getHandlerId()),
                entity.getMergedToReportId() == null ? null : mergedReportNos.get(entity.getMergedToReportId()),
                reasonLabels.getOrDefault(entity.getReasonCode(), entity.getReasonCode()),
                statusLabels.getOrDefault(entity.getStatus(), entity.getStatus()),
                false
        )).toList();
    }

    private CommunityReportAdminVO toReportAdminVO(CommunityReport entity) {
        AppUser reporter = appUserDao.selectById(entity.getReporterId());
        AppUser targetUser = entity.getTargetUserId() == null ? null : appUserDao.selectById(entity.getTargetUserId());
        SysUser handler = entity.getHandlerId() != null ? userDao.selectById(entity.getHandlerId()) : null;
        String mergedReportNo = null;
        if (entity.getMergedToReportId() != null) {
            CommunityReport merged = communityReportDao.selectById(entity.getMergedToReportId());
            mergedReportNo = merged == null ? null : merged.getReportNo();
        }
        return toReportAdminVO(entity, reporter, targetUser, handler, mergedReportNo,
                resolveDictLabel("community_report_reason", entity.getReasonCode()),
                resolveDictLabel("community_report_status", entity.getStatus()), true);
    }

    private CommunityReportAdminVO toReportAdminVO(CommunityReport entity, AppUser reporter, AppUser targetUser,
                                                     SysUser handler, String mergedReportNo,
                                                     String reasonLabel, String statusLabel,
                                                     boolean includeDetail) {
        CommunityReportAdminVO vo = new CommunityReportAdminVO();
        vo.setId(entity.getId());
        vo.setReportNo(entity.getReportNo());
        vo.setReporterId(entity.getReporterId());
        vo.setReporterNo(userNo(reporter, entity.getReporterId()));
        vo.setReporterName(reporter != null ? reporter.getNickname() : null);
        vo.setReporterPhone(reporter != null ? DesensitizeUtil.maskPhone(reporter.getPhone()) : null);
        vo.setTargetType(entity.getTargetType());
        vo.setTargetId(entity.getTargetId());
        vo.setTargetNo(entity.getTargetId());
        vo.setTargetUserId(entity.getTargetUserId());
        vo.setTargetUserNo(userNo(targetUser, entity.getTargetUserId()));
        vo.setTargetUserName(targetUser == null ? null : targetUser.getNickname());
        vo.setReasonCode(entity.getReasonCode());
        vo.setReasonLabel(reasonLabel);
        vo.setExtraText(entity.getExtraText());
        vo.setStatus(entity.getStatus());
        vo.setStatusName(statusLabel);
        vo.setReplyStatus(StrUtil.blankToDefault(entity.getReplyStatus(), "pending"));
        vo.setHandleAction(entity.getHandleAction());
        vo.setPunishAction(entity.getPunishmentAction());
        vo.setHandleRemark(entity.getHandleRemark());
        vo.setHandlerId(entity.getHandlerId());
        vo.setHandlerName(handler != null ? handler.getNickname() : null);
        vo.setMergedIntoReportNo(mergedReportNo);
        vo.setRiskIpMasked(maskIp(entity.getTargetIp()));
        vo.setVersion(entity.getVersion() == null ? 0 : entity.getVersion());
        vo.setHandleTime(format(entity.getHandlerTime()));
        vo.setContext(includeDetail ? resolveReportContext(entity) : null);
        vo.setAuditLogs(includeDetail ? auditLogs("report", entity.getId()) : List.of());
        vo.setCreateTime(entity.getCreateTime() != null ? entity.getCreateTime().format(FMT) : null);
        vo.setUpdateTime(entity.getUpdateTime() != null ? entity.getUpdateTime().format(FMT) : null);
        return vo;
    }

    private AppConfigVO toConfigVO(Map<String, AppConfig> configMap, String key, String type, String defaultValue, String group, String remark) {
        AppConfig entity = configMap.get(key);
        AppConfigVO vo = new AppConfigVO();
        vo.setId(entity != null ? entity.getId() : null);
        vo.setConfigKey(key);
        vo.setConfigValue(entity != null ? entity.getConfigValue() : defaultValue);
        vo.setConfigGroup(entity != null ? entity.getConfigGroup() : group);
        vo.setConfigType(entity != null ? entity.getConfigType() : type);
        vo.setPublicVisible(entity != null && entity.getPublicVisible() != null ? entity.getPublicVisible() : 1);
        vo.setStatus(entity != null ? entity.getStatus() : CommonStatusEnum.ENABLED.getCode());
        vo.setRemark(entity != null && StrUtil.isNotBlank(entity.getRemark()) ? entity.getRemark() : remark);
        vo.setUpdateTime(entity != null && entity.getUpdateTime() != null ? entity.getUpdateTime().format(FMT) : null);
        return vo;
    }

    private MobileEntryConfigVO toMobileEntryVO(MobileEntryConfig entity) {
        MobileEntryConfigVO vo = new MobileEntryConfigVO();
        vo.setId(entity.getId());
        vo.setPageCode(entity.getPageCode());
        vo.setEntryKey(entity.getEntryKey());
        vo.setEntryName(entity.getEntryName());
        vo.setIcon(entity.getIcon());
        vo.setJumpType(entity.getJumpType());
        vo.setJumpTarget(entity.getJumpTarget());
        vo.setBadgeText(entity.getBadgeText());
        vo.setBadgeType(entity.getBadgeType());
        vo.setLoginRequired(entity.getLoginRequired());
        vo.setSort(entity.getSort());
        vo.setStatus(entity.getStatus());
        vo.setExtraJson(entity.getExtraJson());
        vo.setCreateTime(entity.getCreateTime() != null ? entity.getCreateTime().format(FMT) : null);
        return vo;
    }

    private String resolveDictLabel(Long id) {
        if (id == null) {
            return null;
        }
        SysDictData item = dictDataDao.selectById(id);
        return item != null ? item.getDictLabel() : null;
    }

    private String resolveDictLabel(String dictType, String dictValue) {
        if (StrUtil.isBlank(dictValue)) {
            return null;
        }
        List<SysDictData> items = dictDataDao.selectByDictType(dictType);
        String enabledLabel = items.stream()
                .filter(item -> Objects.equals(item.getDictValue(), dictValue))
                .map(SysDictData::getDictLabel)
                .findFirst()
                .orElse(null);
        if (enabledLabel != null) {
            return enabledLabel;
        }
        List<SysDictData> historicalItems = dictDataDao.selectList(new LambdaQueryWrapper<SysDictData>()
                .eq(SysDictData::getDictType, dictType)
                .eq(SysDictData::getDictValue, dictValue)
                .orderByAsc(SysDictData::getId)
                .last("LIMIT 1"));
        return historicalItems.stream()
                .map(SysDictData::getDictLabel)
                .findFirst()
                .orElse(dictValue);
    }

    private void writeLog(String bizType, Long bizId, String action, String beforeValue, String afterValue) {
        ContentOperationLog log = new ContentOperationLog();
        log.setBizType(bizType);
        log.setBizId(bizId);
        log.setAction(action);
        log.setBeforeValue(beforeValue);
        log.setAfterValue(afterValue);
        contentOperationLogDao.insert(log);
    }
}
