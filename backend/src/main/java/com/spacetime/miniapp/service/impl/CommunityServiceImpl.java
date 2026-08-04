package com.spacetime.miniapp.service.impl;

import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.constant.CommunityConfigKeys;
import com.spacetime.common.community.*;
import com.spacetime.common.config.OssConfig;
import com.spacetime.common.dao.*;
import com.spacetime.common.entity.*;
import com.spacetime.common.enums.*;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.miniapp.dto.request.CommunityCommentCreateReq;
import com.spacetime.miniapp.dto.request.CommunityDraftSaveReq;
import com.spacetime.miniapp.dto.request.CommunityPostCreateReq;
import com.spacetime.miniapp.dto.request.CommunityReportCreateReq;
import com.spacetime.miniapp.dto.response.*;
import com.spacetime.miniapp.service.CommunityService;
import com.spacetime.common.service.AppUserAuditContentService;
import com.spacetime.common.service.RelationDomainService;
import com.spacetime.common.util.OssUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.net.URI;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * 小程序社区服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CommunityServiceImpl implements CommunityService {

    /** 时间格式化器：yyyy-MM-dd HH:mm:ss */
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    /** 社区内容（帖子）数据访问 */
    private final CommunityPostDao communityPostDao;
    /** 社区评论数据访问 */
    private final CommunityCommentDao communityCommentDao;
    /** 社区点赞数据访问 */
    private final CommunityLikeDao communityLikeDao;
    /** 社区关注数据访问 */
    private final CommunityFollowDao communityFollowDao;
    /** 社区举报数据访问 */
    private final CommunityReportDao communityReportDao;
    /** 应用配置数据访问 */
    private final AppConfigDao appConfigDao;
    /** 移动端入口配置数据访问 */
    private final MobileEntryConfigDao mobileEntryConfigDao;
    /** 字典数据访问 */
    private final DictDataDao dictDataDao;
    /** 小程序用户数据访问 */
    private final AppUserDao appUserDao;
    /** 用户审核内容统一查询 */
    private final AppUserAuditContentService auditContentService;
    /** PRD01 准入状态计算 */
    private final Prd01AccessEvaluator accessEvaluator;
    /** 用户喜欢关系数据访问。 */
    private final AppRelationLikeDao appRelationLikeDao;
    /** 喜欢关系领域服务。 */
    private final RelationDomainService relationDomainService;
    /** PRD-05 扩展领域数据访问。 */
    private final CommunityExtensionDao communityExtensionDao;
    /** 微信内容安全领域端口。 */
    private final CommunityContentSecurityPort contentSecurityPort;
    /** 正式审核状态机。 */
    private final CommunityAuditPolicy auditPolicy;
    /** PRD-03 聊天举报可信上下文解析端口。 */
    private final ChatReportContextResolver chatReportContextResolver;
    /** OSS 归属校验配置。 */
    private final OssConfig ossConfig;
    /** OSS 对象完成状态校验。 */
    private final OssUtil ossUtil;
    /** OSS 直传归属短期票据。 */
    private final StringRedisTemplate redisTemplate;
    /** PRD-04 解锁历史只读依赖。 */
    private final UserUnlockRecordDao userUnlockRecordDao;

    @Override
    public CommunityTopicHomeVO getTopicHome(Long userId) {
        List<SysDictData> topics = enabledTopics();
        CommunityTopicHomeVO result = new CommunityTopicHomeVO();
        if (topics.isEmpty()) {
            result.setRelated(List.of());
            return result;
        }
        Map<Long, List<CommunityPost>> postsByTopic = publishedPostsByTopic();
        result.setFeatured(toTopicCard(topics.get(0), postsByTopic.getOrDefault(topics.get(0).getId(), List.of())));
        result.setRelated(topics.stream()
                .skip(1)
                .limit(4)
                .map(topic -> toTopicCard(topic, postsByTopic.getOrDefault(topic.getId(), List.of())))
                .toList());
        return result;
    }

    @Override
    public Page<CommunityTopicCardVO> getTopics(int page, int size) {
        int safePage = Math.max(1, page);
        int safeSize = Math.max(1, Math.min(size, 50));
        List<SysDictData> topics = enabledTopics();
        Map<Long, List<CommunityPost>> postsByTopic = publishedPostsByTopic();
        int start = Math.min((safePage - 1) * safeSize, topics.size());
        int end = Math.min(start + safeSize, topics.size());
        List<CommunityTopicCardVO> records = topics.subList(start, end).stream()
                .map(topic -> toTopicCard(topic, postsByTopic.getOrDefault(topic.getId(), List.of())))
                .toList();
        Page<CommunityTopicCardVO> result = new Page<>(safePage, safeSize, topics.size());
        result.setRecords(records);
        return result;
    }

    @Override
    public CommunityTopicDetailVO getTopicDetail(Long topicId) {
        SysDictData topic = requireTopicEntity(topicId);
        List<CommunityPost> posts = communityPostDao.selectList(new LambdaQueryWrapper<CommunityPost>()
                .eq(CommunityPost::getTopicId, topicId)
                .eq(CommunityPost::getStatus, CommunityPostStatusEnum.PUBLISHED.getCode()));
        CommunityTopicDetailVO result = new CommunityTopicDetailVO();
        result.setId(topic.getId());
        result.setTopicCode(topic.getDictValue());
        result.setName(topic.getDictLabel());
        result.setDescription(topicDescription(topic));
        CommunityTopic formalTopic = communityExtensionDao.selectTopicById(topic.getId());
        result.setCoverUrl(formalTopic == null ? null : formalTopic.getCoverUrl());
        result.setPostCount((long) posts.size());
        result.setParticipantCount(posts.stream()
                .map(CommunityPost::getAuthorId)
                .filter(Objects::nonNull)
                .distinct()
                .count());
        return result;
    }

    @Override
    public Page<CommunityPostCardVO> getTopicPosts(Long userId, Long topicId, String sort, int page, int size) {
        requireTopicEntity(topicId);
        int safePage = Math.max(1, page);
        int safeSize = Math.max(1, Math.min(size, 100));
        String normalizedSort = StrUtil.blankToDefault(sort, "HOT").trim().toUpperCase(Locale.ROOT);
        LambdaQueryWrapper<CommunityPost> wrapper = new LambdaQueryWrapper<CommunityPost>()
                .eq(CommunityPost::getTopicId, topicId)
                .eq(CommunityPost::getStatus, CommunityPostStatusEnum.PUBLISHED.getCode());
        if ("HOT".equals(normalizedSort)) {
            wrapper.orderByDesc(CommunityPost::getLikeCount)
                    .orderByDesc(CommunityPost::getCommentCount)
                    .orderByDesc(CommunityPost::getCreateTime);
        } else if ("LATEST".equals(normalizedSort)) {
            wrapper.orderByDesc(CommunityPost::getCreateTime);
        } else {
            throw error("unsupported_topic_sort");
        }
        return toPostCardPage(userId,
                communityPostDao.selectPage(new Page<>(safePage, safeSize), wrapper));
    }

    /**
     * 分页查询社区内容列表
     *
     * @param userId   当前用户ID（可选，用于判断点赞/关注状态）
     * @param postType 内容类型（可选）
     * @param topicId  话题ID（可选）
     * @param page     页码
     * @param size     每页条数
     * @return 内容卡片分页列表
     */
    @Override
    public Page<CommunityPostCardVO> getPosts(Long userId, String postType, Long topicId, String scene, int page, int size) {
        int safePage = Math.max(1, page);
        int safeSize = Math.max(1, Math.min(size, 100));
        String normalizedPostType = StrUtil.isBlank(postType) ? null : normalizeContentType(postType);
        LambdaQueryWrapper<CommunityPost> wrapper = new LambdaQueryWrapper<CommunityPost>()
                .eq(StrUtil.isNotBlank(normalizedPostType), CommunityPost::getPostType, normalizedPostType)
                .eq(topicId != null, CommunityPost::getTopicId, topicId)
                .eq(CommunityPost::getStatus, CommunityPostStatusEnum.PUBLISHED.getCode());
        if (userId != null) {
            List<Long> hiddenAuthorIds = communityExtensionDao.selectPreferences(new LambdaQueryWrapper<CommunityContentPreference>()
                            .eq(CommunityContentPreference::getUserId, userId)
                            .eq(CommunityContentPreference::getActionType, "hide_author_posts")
                            .eq(CommunityContentPreference::getStatus, "enabled"))
                    .stream().map(CommunityContentPreference::getTargetUserId).filter(Objects::nonNull).toList();
            if (!hiddenAuthorIds.isEmpty()) wrapper.notIn(CommunityPost::getAuthorId, hiddenAuthorIds);
        }
        String normalizedScene = StrUtil.blankToDefault(scene, "").trim().toUpperCase(Locale.ROOT);
        if ("FOLLOWING".equals(normalizedScene)) {
            requireLoginForScene(userId);
            List<Long> authorIds = communityFollowDao.selectList(new LambdaQueryWrapper<CommunityFollow>()
                            .eq(CommunityFollow::getFollowerId, userId)
                            .eq(CommunityFollow::getStatus, CommunityFollowStatusEnum.FOLLOW.getCode()))
                    .stream().map(CommunityFollow::getTargetUserId).filter(Objects::nonNull).distinct().toList();
            if (authorIds.isEmpty()) return emptyPostPage(safePage, safeSize);
            wrapper.in(CommunityPost::getAuthorId, authorIds);
        } else if ("CITY".equals(normalizedScene)) {
            requireLoginForScene(userId);
            AppUser currentUser = requireUser(userId);
            if (StrUtil.isBlank(currentUser.getLocationCity())) return emptyPostPage(safePage, safeSize);
            List<Long> authorIds = appUserDao.selectList(new LambdaQueryWrapper<AppUser>()
                            .eq(AppUser::getLocationCity, currentUser.getLocationCity())
                            .eq(AppUser::getAccountStatus, AccountStatusEnum.NORMAL.getCode()))
                    .stream().map(AppUser::getId).filter(Objects::nonNull).toList();
            if (authorIds.isEmpty()) return emptyPostPage(safePage, safeSize);
            wrapper.in(CommunityPost::getAuthorId, authorIds);
        } else if (!normalizedScene.isEmpty() && !"HOT".equals(normalizedScene)) {
            throw error("unsupported_feed_scene");
        }
        if ("HOT".equals(normalizedScene)) {
            wrapper.orderByDesc(CommunityPost::getLikeCount)
                    .orderByDesc(CommunityPost::getCommentCount)
                    .orderByDesc(CommunityPost::getCreateTime);
        } else {
            wrapper.orderByDesc(CommunityPost::getCreateTime);
        }
        Page<CommunityPost> result = communityPostDao.selectPage(new Page<>(safePage, safeSize), wrapper);
        return toPostCardPage(userId, result);
    }

    @Override
    public Page<YuemuUserCardVO> getYuemuUsers(Long userId, int page, int size) {
        requireLoginForScene(userId);
        AppUser currentUser = requireUser(userId);
        int safePage = Math.max(1, page);
        int safeSize = Math.max(1, Math.min(size, 50));
        Page<AppUser> candidatePage = appUserDao.selectPage(new Page<>(safePage, safeSize),
                new LambdaQueryWrapper<AppUser>()
                        .ne(AppUser::getId, userId)
                        .eq(AppUser::getAccountStatus, AccountStatusEnum.NORMAL.getCode())
                        .eq(AppUser::getFirstLoginCompleted, 1)
                        .orderByDesc(AppUser::getLastLoginTime)
                        .orderByDesc(AppUser::getId));
        List<Long> userIds = candidatePage.getRecords().stream()
                .map(AppUser::getId)
                .filter(Objects::nonNull)
                .toList();
        Map<Long, List<String>> albums = auditContentService.publicAlbumPhotos(userIds);
        Map<Long, String> avatars = auditContentService.publicAvatars(userIds);
        Set<Long> likedUserIds = userIds.isEmpty() ? Set.of() : appRelationLikeDao.selectList(
                        new LambdaQueryWrapper<AppRelationLike>()
                                .eq(AppRelationLike::getFromUserId, userId)
                                .in(AppRelationLike::getToUserId, userIds)
                                .eq(AppRelationLike::getLikeStatus, RelationLikeStatusEnum.ACTIVE.getCode())
                                .eq(AppRelationLike::getActiveMarker, 1))
                .stream()
                .map(AppRelationLike::getToUserId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        List<YuemuUserCardVO> cards = candidatePage.getRecords().stream()
                .map(candidate -> toYuemuCard(currentUser, candidate, albums, avatars, likedUserIds))
                .filter(Objects::nonNull)
                .toList();
        Page<YuemuUserCardVO> result = new Page<>(safePage, safeSize, candidatePage.getTotal());
        result.setRecords(cards);
        return result;
    }

    @Override
    @Transactional
    public YuemuLikeToggleVO toggleYuemuLike(Long userId, Long targetUserId) {
        ensureInteractionAllowed(userId);
        if (Objects.equals(userId, targetUserId)) {
            throw error("cannot_like_self");
        }
        AppUser target = requireUser(targetUserId);
        if (!AccountStatusEnum.NORMAL.getCode().equals(target.getAccountStatus())) {
            throw error("target_user_unavailable");
        }
        AppRelationLike active = appRelationLikeDao.selectOne(new LambdaQueryWrapper<AppRelationLike>()
                .eq(AppRelationLike::getFromUserId, userId)
                .eq(AppRelationLike::getToUserId, targetUserId)
                .eq(AppRelationLike::getLikeStatus, RelationLikeStatusEnum.ACTIVE.getCode())
                .eq(AppRelationLike::getActiveMarker, 1));
        if (active != null) {
            relationDomainService.cancelLike(userId, targetUserId, LocalDateTime.now());
            return new YuemuLikeToggleVO(false);
        }
        relationDomainService.createLike(UUID.randomUUID().toString(), userId, targetUserId,
                RelationSourceSceneEnum.YUEMU.getCode(), LocalDateTime.now());
        return new YuemuLikeToggleVO(true);
    }

    private YuemuUserCardVO toYuemuCard(AppUser currentUser,
                                        AppUser candidate,
                                        Map<Long, List<String>> albums,
                                        Map<Long, String> avatars,
                                        Set<Long> likedUserIds) {
        List<String> photos = albums.getOrDefault(candidate.getId(), List.of());
        String photoUrl = photos.isEmpty() ? avatars.get(candidate.getId()) : photos.get(0);
        if (StrUtil.isBlank(photoUrl)) {
            return null;
        }
        YuemuUserCardVO card = new YuemuUserCardVO();
        card.setUserId(candidate.getId());
        card.setNickname(StrUtil.blankToDefault(candidate.getNickname(), message("anonymous_user")));
        card.setPhotoUrl(photoUrl);
        card.setFateLabel(resolveFateLabel(currentUser, candidate));
        card.setEducationSchool(resolveEducationSchool(candidate));
        card.setOnlineText(resolveOnlineText(candidate.getLastLoginTime()));
        card.setLiked(likedUserIds.contains(candidate.getId()));
        return card;
    }

    private String resolveFateLabel(AppUser currentUser, AppUser candidate) {
        if (StrUtil.isNotBlank(currentUser.getMajor()) && currentUser.getMajor().equals(candidate.getMajor())) {
            return message("fate_same_major");
        }
        if (StrUtil.isNotBlank(currentUser.getSchool()) && currentUser.getSchool().equals(candidate.getSchool())) {
            return message("fate_same_school");
        }
        Set<String> currentTags = new LinkedHashSet<>(parseJsonList(currentUser.getTags()));
        String commonTag = parseJsonList(candidate.getTags()).stream().filter(currentTags::contains).findFirst().orElse(null);
        return commonTag == null ? message("fate_profile_match") : message("fate_same_hobby");
    }

    private String resolveEducationSchool(AppUser candidate) {
        String education = switch (StrUtil.blankToDefault(candidate.getEducationLevel(), "").toUpperCase(Locale.ROOT)) {
            case "DOCTOR", "PHD" -> message("education_doctor");
            case "MASTER", "POSTGRADUATE" -> message("education_master");
            case "BACHELOR", "UNDERGRADUATE" -> message("education_bachelor");
            case "COLLEGE", "JUNIOR_COLLEGE" -> message("education_college");
            default -> "";
        };
        if (StrUtil.isBlank(education)) return StrUtil.blankToDefault(candidate.getSchool(), message("profile_incomplete"));
        if (StrUtil.isBlank(candidate.getSchool())) return education;
        return education + "·" + candidate.getSchool();
    }

    private String resolveOnlineText(LocalDateTime lastLoginTime) {
        if (lastLoginTime == null) return message("online_unknown");
        long minutes = Math.max(1, java.time.Duration.between(lastLoginTime, LocalDateTime.now()).toMinutes());
        if (minutes < 60) return message("online_minutes", minutes);
        if (minutes < 1440) return message("online_hours", minutes / 60);
        return message("online_days", minutes / 1440);
    }

    private void requireLoginForScene(Long userId) {
        if (userId == null) throw error(401, "login_expired");
    }

    private Page<CommunityPostCardVO> emptyPostPage(int page, int size) {
        Page<CommunityPostCardVO> result = new Page<>(page, size, 0);
        result.setRecords(List.of());
        return result;
    }

    /**
     * 查询内容详情
     *
     * @param userId 当前用户ID（可选）
     * @param postId 内容ID
     * @return 内容详情（含作者信息、点赞/关注状态）
     */
    @Override
    public CommunityPostDetailVO getPostDetail(Long userId, String postId) {
        CommunityPost post = requirePostRef(postId);
        if (!CommunityPostStatusEnum.PUBLISHED.getCode().equals(post.getStatus())
                && !Objects.equals(userId, post.getAuthorId())) {
            throw error("content_unavailable");
        }
        CommunityPostDetailVO vo = new CommunityPostDetailVO();
        fillPostDetail(vo, userId, post);
        return vo;
    }

    /**
     * 发布社区内容
     *
     * @param userId 当前用户ID
     * @param req    内容发布请求（类型/标题/正文/图片/话题/@用户）
     * @return 新内容ID
     */
    @Override
    @Transactional
    public CommunityPublishResultVO createPost(Long userId, CommunityPostCreateReq req) {
        // 1. 校验交互权限
        ensureCommunityWriteAllowed(userId, "publish_post");
        // 2. 校验请求参数
        validatePostRequest(userId, req);

        String contentType = req.resolvedContentType();
        AppUser author = requireUser(userId);
        boolean machineAuditEnabled = defaultBool(CommunityConfigKeys.MACHINE_AUDIT_ENABLED, true);
        CommunitySecurityResult securityResult = machineAuditEnabled
                ? contentSecurityPort.checkPost(author.getOpenid(), req.getContent(), req.getImageUrls(), "community")
                : CommunitySecurityResult.review("machine_audit_disabled");
        CommunityAuditDecision decision = auditPolicy.decidePost(contentType, securityResult, machineAuditEnabled);

        CommunityPost entity = new CommunityPost();
        entity.setPostNo(businessNo("POST"));
        entity.setAuthorId(userId);
        entity.setPostType(contentType);
        entity.setSourceScene("sincere_post".equals(contentType)
                ? "qianxun_zhiyin_sincere" : "qianxun_chengjia");
        entity.setTitle(null);
        entity.setContent(StrUtil.trim(req.getContent()));
        entity.setImageUrls(toJsonList(req.getImageUrls()));
        entity.setTopicId(req.getTopicId());
        CommunityTopic topic = communityExtensionDao.selectTopicById(req.getTopicId());
        entity.setTopicCode(topic == null ? null : topic.getTopicCode());
        entity.setTopicNameSnapshot(topic.getTopicName());
        entity.setMentionUserIds(null);
        entity.setStatus(decision.status());
        entity.setAuditStatus("published".equals(decision.status()) ? CommunityAuditStatusEnum.APPROVED.getCode()
                : CommunityAuditStatusEnum.PENDING.getCode());
        entity.setMachineResult(decision.machineConclusion());
        entity.setMachineCode(decision.machineCode());
        entity.setMachineDetail(decision.detail());
        entity.setMachineCheckedAt(LocalDateTime.now());
        entity.setSampleRequired(decision.sampleRequired() ? 1 : 0);
        entity.setVersion(0);
        entity.setPublishedAt("published".equals(decision.status()) ? LocalDateTime.now() : null);
        entity.setAuthorIp(requestIp());
        entity.setLikeCount(0);
        entity.setCommentCount(0);
        entity.setReportCount(0);
        entity.setDeletedByUser(0);
        // 3. 写入数据库
        communityPostDao.insert(entity);
        consumeUploadTickets(req.getImageUrls());
        persistMediaAuditTasks(entity, req.getImageUrls(), decision.machineCode());
        writeAudit("post", entity.getPostNo(), entity.getId(), "machine_audit",
                decision.machineConclusion(), decision.detail(), decision.machineCode());
        writeOutbox("content_submitted", "post", entity.getPostNo(), 0,
                "{\"postNo\":\"" + entity.getPostNo() + "\",\"authorId\":" + userId + "}");
        if ("published".equals(decision.status())) {
            writeOutbox("content_published", "post", entity.getPostNo(), 0,
                    "{\"postNo\":\"" + entity.getPostNo() + "\"}");
        }
        deleteDraft(userId, contentType);
        log.info("Community post submitted: userId={}, contentType={}, postNo={}, status={}",
                userId, contentType, entity.getPostNo(), entity.getStatus());
        return new CommunityPublishResultVO(entity.getId(), entity.getPostNo(), entity.getStatus(),
                resolveStatusLabel("community_content_status", entity.getStatus()),
                copy("publish_" + entity.getStatus(), resolveStatusLabel("community_content_status", entity.getStatus())));
    }

    /**
     * 删除自己的社区内容（软删除）
     *
     * @param userId 当前用户ID
     * @param postId 内容ID
     */
    @Override
    @Transactional
    public void deletePost(Long userId, String postId) {
        // 1. 校验内容存在且为本人所发
        CommunityPost post = requirePostRef(postId);
        if (!Objects.equals(post.getAuthorId(), userId)) {
            throw error("delete_own_content_only");
        }
        // 2. 软删除：更新状态
        post.setStatus(CommunityPostStatusEnum.DELETED.getCode());
        post.setDeletedByUser(1);
        communityPostDao.updateById(post);
        log.info("Community post deleted: userId={}, postId={}", userId, postId);
    }

    /**
     * 分页查询内容的评论列表
     *
     * @param userId 当前用户ID（可选）
     * @param postId 内容ID
     * @param page   页码
     * @param size   每页条数
     * @return 评论分页列表
     */
    @Override
    public Page<CommunityCommentVO> getComments(Long userId, String postId, int page, int size) {
        CommunityPost post = requirePostRef(postId);
        LambdaQueryWrapper<CommunityComment> wrapper = new LambdaQueryWrapper<CommunityComment>()
                .eq(CommunityComment::getPostId, post.getId())
                .eq(CommunityComment::getStatus, CommunityPostStatusEnum.PUBLISHED.getCode())
                .orderByAsc(CommunityComment::getCreateTime);
        Page<CommunityComment> result = communityCommentDao.selectPage(new Page<>(page, Math.min(size, 100)), wrapper);
        return toCommentPage(userId, result);
    }

    /**
     * 发表评论
     *
     * @param userId 当前用户ID
     * @param req    评论请求（内容ID/父评论ID/被回复用户ID/评论正文）
     * @return 新评论ID
     */
    @Override
    @Transactional
    public CommunityCommentResultVO createComment(Long userId, CommunityCommentCreateReq req) {
        // 1. 校验交互权限
        ensureCommunityWriteAllowed(userId, "comment");
        // 2. 校验内容存在且可评论
        CommunityPost post = requirePostRef(req.getPostId());
        if (!CommunityPostStatusEnum.PUBLISHED.getCode().equals(post.getStatus())) {
            throw error("content_not_commentable");
        }

        AppUser author = requireUser(userId);
        boolean machineAuditEnabled = defaultBool(CommunityConfigKeys.MACHINE_AUDIT_ENABLED, true);
        CommunitySecurityResult securityResult = machineAuditEnabled
                ? contentSecurityPort.checkText(author.getOpenid(), req.getContent(), "community")
                : CommunitySecurityResult.unavailable("machine_audit_disabled");
        CommunityAuditDecision decision = auditPolicy.decideComment(securityResult, machineAuditEnabled);
        if (decision.retryRequired()) {
            throw error(505010, "comment_retry");
        }

        CommunityComment entity = new CommunityComment();
        entity.setCommentNo(businessNo("CMT"));
        entity.setPostId(post.getId());
        entity.setAuthorId(userId);
        entity.setParentCommentId(req.getParentCommentId());
        entity.setReplyUserId(req.getReplyUserId());
        entity.setContent(StrUtil.trim(req.getContent()));
        entity.setStatus(decision.status());
        entity.setAuditStatus("published".equals(decision.status())
                ? CommunityAuditStatusEnum.APPROVED.getCode() : CommunityAuditStatusEnum.REJECTED.getCode());
        entity.setMachineResult(decision.machineConclusion());
        entity.setMachineCode(decision.machineCode());
        entity.setMachineDetail(decision.detail());
        entity.setMachineCheckedAt(LocalDateTime.now());
        entity.setVersion(0);
        entity.setPublishedAt("published".equals(decision.status()) ? LocalDateTime.now() : null);
        entity.setAuthorIp(requestIp());
        entity.setLikeCount(0);
        entity.setReportCount(0);
        // 3. 写入评论
        communityCommentDao.insert(entity);

        // 4. 更新内容评论计数
        if ("published".equals(entity.getStatus())) {
            post.setCommentCount((post.getCommentCount() == null ? 0 : post.getCommentCount()) + 1);
            communityPostDao.updateById(post);
            writeOutbox("comment_created", "comment", entity.getCommentNo(), 0,
                    "{\"commentNo\":\"" + entity.getCommentNo() + "\",\"postNo\":\"" + post.getPostNo() + "\"}");
        }
        writeAudit("comment", entity.getCommentNo(), entity.getId(), "machine_audit",
                decision.machineConclusion(), decision.detail(), decision.machineCode());
        log.info("Community comment submitted: userId={}, postId={}, commentNo={}, status={}", userId, req.getPostId(), entity.getCommentNo(), entity.getStatus());
        return new CommunityCommentResultVO(entity.getId(), entity.getCommentNo(), entity.getStatus(),
                resolveStatusLabel("community_comment_status", entity.getStatus()),
                copy("comment_" + entity.getStatus(), resolveStatusLabel("community_comment_status", entity.getStatus())),
                post.getCommentCount());
    }

    /**
     * 删除自己的评论（软删除）
     *
     * @param userId    当前用户ID
     * @param commentId 评论ID
     */
    @Override
    @Transactional
    public void deleteComment(Long userId, String commentId) {
        // 1. 校验评论存在且为本人所发
        CommunityComment comment = requireCommentRef(commentId);
        if (!Objects.equals(comment.getAuthorId(), userId)) {
            throw error("delete_own_comment_only");
        }
        // 2. 幂等：已删除直接返回
        if (CommunityPostStatusEnum.DELETED.getCode().equals(comment.getStatus())) {
            return;
        }
        // 3. 软删除评论
        comment.setStatus(CommunityPostStatusEnum.DELETED.getCode());
        communityCommentDao.updateById(comment);

        // 4. 更新内容评论计数
        CommunityPost post = requirePost(comment.getPostId());
        int count = post.getCommentCount() == null ? 0 : post.getCommentCount();
        post.setCommentCount(Math.max(0, count - 1));
        communityPostDao.updateById(post);
        log.info("Community comment deleted: userId={}, commentId={}", userId, commentId);
    }

    /**
     * 点赞/取消点赞内容（三态切换：未点赞→点赞→取消赞→重新点赞）
     *
     * @param userId 当前用户ID
     * @param postId 内容ID
     * @return 点赞切换结果（是否已赞、当前点赞数）
     */
    @Override
    @Transactional
    public CommunityLikeToggleVO toggleLike(Long userId, String postId) {
        // 1. 校验交互权限
        ensureInteractionAllowed(userId);
        // 2. 查询内容
        CommunityPost post = requirePostRef(postId);
        // 3. 查询已有点赞记录
        CommunityLike like = communityLikeDao.selectOne(new LambdaQueryWrapper<CommunityLike>()
                .eq(CommunityLike::getPostId, post.getId())
                .eq(CommunityLike::getUserId, userId));

        // 4. 三态切换逻辑
        boolean liked;
        int likeCount = post.getLikeCount() == null ? 0 : post.getLikeCount();
        if (like == null) {
            // 从未点赞 → 点赞
            like = new CommunityLike();
            like.setPostId(post.getId());
            like.setUserId(userId);
            like.setStatus(CommonStatusEnum.ENABLED.getCode());
            communityLikeDao.insert(like);
            liked = true;
            likeCount += 1;
        } else if (CommonStatusEnum.ENABLED.getCode().equals(like.getStatus())) {
            // 已点赞 → 取消赞
            like.setStatus(CommonStatusEnum.DISABLED.getCode());
            communityLikeDao.updateById(like);
            liked = false;
            likeCount = Math.max(0, likeCount - 1);
        } else {
            // 已取消赞 → 重新点赞
            like.setStatus(CommonStatusEnum.ENABLED.getCode());
            communityLikeDao.updateById(like);
            liked = true;
            likeCount += 1;
        }
        // 5. 更新内容点赞计数
        post.setLikeCount(likeCount);
        communityPostDao.updateById(post);

        CommunityLikeToggleVO vo = new CommunityLikeToggleVO();
        vo.setLiked(liked);
        vo.setLikeCount(likeCount);
        log.info("Community like toggled: userId={}, postId={}, liked={}", userId, postId, liked);
        return vo;
    }

    /**
     * 关注/取消关注用户
     *
     * @param userId       当前用户ID
     * @param targetUserId 目标用户ID
     * @return 关注切换结果（是否已关注）
     */
    @Override
    @Transactional
    public CommunityFollowToggleVO toggleFollow(Long userId, Long targetUserId) {
        // 1. 校验交互权限
        ensureInteractionAllowed(userId);
        // 2. 不能关注自己
        if (Objects.equals(userId, targetUserId)) {
            throw error("cannot_follow_self");
        }
        // 3. 校验目标用户存在
        requireUser(targetUserId);

        // 4. 查询已有关注记录
        CommunityFollow follow = communityFollowDao.selectOne(new LambdaQueryWrapper<CommunityFollow>()
                .eq(CommunityFollow::getFollowerId, userId)
                .eq(CommunityFollow::getTargetUserId, targetUserId));

        // 5. 三态切换逻辑
        boolean following;
        if (follow == null) {
            // 从未关注 → 关注
            follow = new CommunityFollow();
            follow.setFollowerId(userId);
            follow.setTargetUserId(targetUserId);
            follow.setStatus(CommunityFollowStatusEnum.FOLLOW.getCode());
            communityFollowDao.insert(follow);
            following = true;
        } else if (CommunityFollowStatusEnum.FOLLOW.getCode().equals(follow.getStatus())) {
            // 已关注 → 取消关注
            follow.setStatus(CommunityFollowStatusEnum.UNFOLLOW.getCode());
            communityFollowDao.updateById(follow);
            following = false;
        } else {
            // 已取消关注 → 重新关注
            follow.setStatus(CommunityFollowStatusEnum.FOLLOW.getCode());
            communityFollowDao.updateById(follow);
            following = true;
        }

        CommunityFollowToggleVO vo = new CommunityFollowToggleVO();
        vo.setFollowing(following);
        log.info("Community follow toggled: userId={}, targetUserId={}, following={}", userId, targetUserId, following);
        return vo;
    }

    @Override
    public long countFollowing(Long userId) {
        requireUser(userId);
        return communityFollowDao.selectList(new LambdaQueryWrapper<CommunityFollow>()
                .eq(CommunityFollow::getFollowerId, userId)
                .eq(CommunityFollow::getStatus, CommunityFollowStatusEnum.FOLLOW.getCode())).size();
    }

    /**
     * 提交举报
     *
     * @param userId 举报人ID
     * @param req    举报请求（目标类型/目标ID/举报原因/补充说明）
     * @return 新举报ID
     */
    @Override
    @Transactional
    public CommunityReportResultVO createReport(Long userId, CommunityReportCreateReq req) {
        ensureReportAllowed(userId);
        // 1. 校验举报目标类型
        CommunityReportTargetTypeEnum targetType = CommunityReportTargetTypeEnum.getByCode(req.getTargetType());
        if (targetType == null) {
            throw error("unsupported_report_target");
        }
        // 2. 校验举报原因合法
        requireReportReason(req.getReasonCode());

        CommunityReport duplicate = communityReportDao.selectList(new LambdaQueryWrapper<CommunityReport>()
                        .eq(CommunityReport::getReporterId, userId)
                        .eq(CommunityReport::getTargetType, req.getTargetType())
                        .eq(CommunityReport::getTargetId, req.getTargetId())
                        .in(CommunityReport::getStatus, List.of("pending", "processing")))
                .stream().findFirst().orElse(null);
        if (duplicate != null) {
            throw error(505008, "report_duplicate");
        }

        Long targetUserId = null;
        String contextJson = null;
        String evidenceJson = null;
        String targetNo = req.getTargetId();
        if (CommunityReportTargetTypeEnum.CHAT.equals(targetType)) {
            TrustedChatReportContext trusted;
            try {
                trusted = chatReportContextResolver.resolve(userId,
                        new ChatReportLookup(req.getSourceType(), req.getConversationNo(), req.getWhisperNo(), req.getMessageNo()));
            } catch (BusinessException ex) {
                if (ex.getCode() == 505016) throw error(505016, "chat_report_unavailable");
                throw ex;
            }
            targetNo = trusted.targetNo();
            targetUserId = trusted.targetUserId();
            contextJson = "{\"sourceType\":\"" + jsonSafe(trusted.sourceType()) + "\",\"targetNo\":\""
                    + jsonSafe(trusted.targetNo()) + "\"}";
            evidenceJson = trusted.evidenceJson();
        } else {
            targetUserId = increaseReportCount(req.getTargetType(), req.getTargetId());
        }

        // 4. 创建举报记录
        CommunityReport report = new CommunityReport();
        report.setReportNo(businessNo("RPT"));
        report.setReporterId(userId);
        report.setTargetType(req.getTargetType());
        report.setSourceType(req.getSourceType());
        report.setTargetId(targetNo);
        report.setTargetUserId(targetUserId);
        report.setReasonCode(req.getReasonCode());
        report.setExtraText(StrUtil.blankToDefault(StrUtil.trim(req.getExtraText()), null));
        report.setContextJson(contextJson);
        report.setEvidenceJson(evidenceJson);
        report.setStatus(CommunityReportStatusEnum.PENDING.getCode());
        report.setVersion(0);
        report.setActiveMarker(1);
        communityReportDao.insert(report);
        writeOutbox("report_submitted", "report", report.getReportNo(), 0,
                "{\"reportNo\":\"" + report.getReportNo() + "\",\"targetType\":\""
                        + jsonSafe(report.getTargetType()) + "\"}");
        log.info("Community report submitted: userId={}, targetType={}, targetNo={}, reportNo={}",
                userId, req.getTargetType(), targetNo, report.getReportNo());
        return new CommunityReportResultVO(report.getId(), report.getReportNo(), report.getStatus(),
                resolveStatusLabel("community_report_status", report.getStatus()),
                copy("report_submitted", resolveStatusLabel("community_report_status", report.getStatus())));
    }

    @Override
    public CommunityMetaVO getMeta() {
        CommunityConfigVO config = getConfig();
        CommunityMetaVO result = new CommunityMetaVO();
        List<String> dictTypes = List.of(
                "community_content_type", "community_content_status", "community_comment_status",
                "community_report_status", "community_report_target_type", "community_report_reason",
                "community_punish_action", "community_mute_period", "community_source_scene",
                "community_interaction_type", "community_relation_type", "community_publish_status",
                "community_media_type", "community_machine_result", "community_risk_level",
                "community_distribution_scene", "community_ip_block_period", "community_write_scope",
                "community_topic_status", "community_topic_display_scene", "community_yes_no"
        );
        for (String dictType : dictTypes) {
            result.getDictionaries().put(dictType, toDictOptions(dictDataDao.selectByDictType(dictType)));
        }
        result.getDictionaries().put("topics", config.getTopics());
        result.getDictionaries().put("reportReasons", config.getReportReasons());
        List<AppConfig> copyItems = appConfigDao.selectByGroup("COMMUNITY_COPY");
        if (copyItems != null) {
            copyItems.stream().filter(item -> item.getConfigKey() != null).forEach(item ->
                    result.getCopies().put(item.getConfigKey().replace(CommunityConfigKeys.COPY_PREFIX, ""), item.getConfigValue()));
        }
        List<AppConfig> configItems = appConfigDao.selectByGroup("COMMUNITY");
        if (configItems != null) {
            configItems.stream().filter(item -> item.getConfigKey() != null).forEach(item ->
                    result.getConfigs().put(item.getConfigKey(), parseConfigValue(item.getConfigValue(), item.getConfigType())));
        }
        result.getConfigs().put("postMaxImages", config.getPostMaxImages());
        result.getConfigs().put("postMaxTextLength", config.getPostMaxTextLength());
        result.getConfigs().put("reportEntryEnabled", config.getReportEntryEnabled());
        result.setHomeTabs(config.getHomeTabs());
        return result;
    }

    @Override
    public CommunityDraftVO getDraft(Long userId, String contentType) {
        requireUser(userId);
        String normalized = normalizeContentType(contentType);
        CommunityPostDraft entity = communityExtensionDao.selectDraftOne(new LambdaQueryWrapper<CommunityPostDraft>()
                .eq(CommunityPostDraft::getUserId, userId)
                .eq(CommunityPostDraft::getContentType, normalized));
        return entity == null ? null : toDraftVO(entity);
    }

    @Override
    @Transactional
    public CommunityDraftVO saveDraft(Long userId, String contentType, CommunityDraftSaveReq req) {
        requireUser(userId);
        String normalized = normalizeContentType(contentType);
        CommunityPostDraft entity = communityExtensionDao.selectDraftOne(new LambdaQueryWrapper<CommunityPostDraft>()
                .eq(CommunityPostDraft::getUserId, userId)
                .eq(CommunityPostDraft::getContentType, normalized));
        List<String> imageUrls = draftImageUrls(req);
        if (entity == null) {
            entity = new CommunityPostDraft();
            entity.setUserId(userId);
            entity.setContentType(normalized);
            entity.setVersion(0);
            fillDraft(entity, req, imageUrls);
            communityExtensionDao.insertDraft(entity);
        } else {
            int expected = req.getVersion() == null ? entity.getVersion() : req.getVersion();
            if (!Objects.equals(expected, entity.getVersion())) {
                throw error(505009, "draft_version_conflict");
            }
            fillDraft(entity, req, imageUrls);
            entity.setVersion(defaultZero(entity.getVersion()) + 1);
            communityExtensionDao.updateDraft(entity);
        }
        writeOutbox("draft_saved", "draft", String.valueOf(entity.getId()), entity.getVersion(),
                "{\"contentType\":\"" + normalized + "\",\"userId\":" + userId + "}");
        return toDraftVO(entity);
    }

    @Override
    @Transactional
    public void deleteDraft(Long userId, String contentType) {
        String normalized = normalizeContentType(contentType);
        CommunityPostDraft entity = communityExtensionDao.selectDraftOne(new LambdaQueryWrapper<CommunityPostDraft>()
                .eq(CommunityPostDraft::getUserId, userId)
                .eq(CommunityPostDraft::getContentType, normalized));
        if (entity != null) communityExtensionDao.deleteDraft(entity.getId());
    }

    @Override
    public Page<CommunityPostCardVO> getUserPosts(Long currentUserId, String targetUserRef, boolean mine, int page, int size) {
        Long targetUserId = resolveUserRef(targetUserRef);
        requireUser(targetUserId);
        LambdaQueryWrapper<CommunityPost> wrapper = new LambdaQueryWrapper<CommunityPost>()
                .eq(CommunityPost::getAuthorId, targetUserId)
                .eq(!mine, CommunityPost::getStatus, CommunityPostStatusEnum.PUBLISHED.getCode())
                .orderByDesc(CommunityPost::getCreateTime);
        Page<CommunityPost> data = communityPostDao.selectPage(new Page<>(safePage(page), safeSize(size, 100)), wrapper);
        return toPostCardPage(currentUserId, data);
    }

    @Override
    public Page<CommunityInteractionRecordVO> getInteractionHistory(Long userId, String type, int page, int size) {
        requireUser(userId);
        String normalized = StrUtil.blankToDefault(type, "viewed").toLowerCase(Locale.ROOT);
        if (!Set.of("commented", "liked", "unlocked", "viewed").contains(normalized)) {
            throw error("unsupported_interaction_type");
        }
        List<CommunityInteractionRecordVO> records = new ArrayList<>();
        if ("commented".equals(normalized)) {
            for (CommunityComment item : communityCommentDao.selectList(new LambdaQueryWrapper<CommunityComment>()
                    .eq(CommunityComment::getAuthorId, userId).orderByDesc(CommunityComment::getCreateTime))) {
                CommunityPost post = communityPostDao.selectById(item.getPostId());
                if (post != null) records.add(interactionRecord("commented", "comment-" + item.getId(), item.getCreateTime(), userId, post));
            }
        } else if ("liked".equals(normalized)) {
            for (CommunityLike item : communityLikeDao.selectList(new LambdaQueryWrapper<CommunityLike>()
                    .eq(CommunityLike::getUserId, userId).eq(CommunityLike::getStatus, CommonStatusEnum.ENABLED.getCode())
                    .orderByDesc(CommunityLike::getUpdateTime))) {
                CommunityPost post = communityPostDao.selectById(item.getPostId());
                if (post != null) records.add(interactionRecord("liked", "like-" + item.getId(), item.getUpdateTime(), userId, post));
            }
        } else if ("viewed".equals(normalized)) {
            for (CommunityViewHistory item : communityExtensionDao.selectViews(new LambdaQueryWrapper<CommunityViewHistory>()
                    .eq(CommunityViewHistory::getUserId, userId).orderByDesc(CommunityViewHistory::getViewedAt))) {
                CommunityPost post = communityPostDao.selectById(item.getPostId());
                if (post != null) records.add(interactionRecord("viewed", "view-" + item.getId(), item.getViewedAt(), userId, post));
            }
        } else {
            for (UserUnlockRecord item : userUnlockRecordDao.selectList(new LambdaQueryWrapper<UserUnlockRecord>()
                    .eq(UserUnlockRecord::getUserId, userId).orderByDesc(UserUnlockRecord::getEffectiveTime))) {
                AppUser target = item.getTargetUserId() == null ? null : appUserDao.selectById(item.getTargetUserId());
                CommunityInteractionRecordVO vo = new CommunityInteractionRecordVO();
                vo.setId(item.getUnlockNo());
                vo.setInteractionType("unlocked");
                vo.setTargetUserId(item.getTargetUserId());
                vo.setTargetUserNo(userNo(item.getTargetUserId()));
                vo.setNickname(target == null ? null : target.getNickname());
                vo.setAvatar(item.getTargetUserId() == null ? null : auditContentService.publicAvatar(item.getTargetUserId()));
                vo.setDescription(target == null ? null : profileDescription(target));
                vo.setInteractionTime(formatTime(item.getEffectiveTime()));
                records.add(vo);
            }
        }
        return slice(records, page, size);
    }

    @Override
    public Page<CommunityPostCardVO> getViewHistory(Long userId, int page, int size) {
        requireUser(userId);
        List<CommunityPostCardVO> records = communityExtensionDao.selectViews(new LambdaQueryWrapper<CommunityViewHistory>()
                        .eq(CommunityViewHistory::getUserId, userId).orderByDesc(CommunityViewHistory::getViewedAt))
                .stream().map(item -> communityPostDao.selectById(item.getPostId())).filter(Objects::nonNull)
                .map(item -> toPostCard(userId, item)).toList();
        return slice(records, page, size);
    }

    @Override
    @Transactional
    public void recordView(Long userId, String postRef) {
        CommunityPost post = requirePostRef(postRef);
        CommunityViewHistory entity = communityExtensionDao.selectViewOne(new LambdaQueryWrapper<CommunityViewHistory>()
                .eq(CommunityViewHistory::getUserId, userId).eq(CommunityViewHistory::getPostId, post.getId()));
        if (entity == null) {
            entity = new CommunityViewHistory();
            entity.setUserId(userId);
            entity.setPostId(post.getId());
            entity.setViewedAt(LocalDateTime.now());
            communityExtensionDao.insertView(entity);
        } else {
            entity.setViewedAt(LocalDateTime.now());
            communityExtensionDao.updateView(entity);
        }
    }

    @Override
    @Transactional
    public void clearViewHistory(Long userId) {
        communityExtensionDao.deleteViews(new LambdaQueryWrapper<CommunityViewHistory>()
                .eq(CommunityViewHistory::getUserId, userId));
    }

    @Override
    public Page<CommunityRelationUserVO> getRelations(Long userId, String relation, int page, int size) {
        requireUser(userId);
        boolean fans = "fans".equalsIgnoreCase(relation) || "followers".equalsIgnoreCase(relation);
        List<CommunityFollow> follows = communityFollowDao.selectList(new LambdaQueryWrapper<CommunityFollow>()
                .eq(fans, CommunityFollow::getTargetUserId, userId)
                .eq(!fans, CommunityFollow::getFollowerId, userId)
                .eq(CommunityFollow::getStatus, CommunityFollowStatusEnum.FOLLOW.getCode())
                .orderByDesc(CommunityFollow::getUpdateTime));
        List<CommunityRelationUserVO> records = follows.stream()
                .map(item -> toRelationUser(userId, fans ? item.getFollowerId() : item.getTargetUserId(), item.getUpdateTime(), null))
                .filter(Objects::nonNull).toList();
        return slice(records, page, size);
    }

    @Override
    public Page<CommunityRelationUserVO> getPostInteractors(Long userId, String postRef, String type, int page, int size) {
        CommunityPost post = requirePostRef(postRef);
        Map<Long, LocalDateTime> users = new LinkedHashMap<>();
        Map<Long, String> summaries = new HashMap<>();
        if ("liked".equalsIgnoreCase(type)) {
            for (CommunityLike item : communityLikeDao.selectList(new LambdaQueryWrapper<CommunityLike>()
                    .eq(CommunityLike::getPostId, post.getId()).eq(CommunityLike::getStatus, CommonStatusEnum.ENABLED.getCode())
                    .orderByDesc(CommunityLike::getUpdateTime))) {
                users.putIfAbsent(item.getUserId(), item.getUpdateTime());
            }
        } else if ("commented".equalsIgnoreCase(type)) {
            for (CommunityComment item : communityCommentDao.selectList(new LambdaQueryWrapper<CommunityComment>()
                    .eq(CommunityComment::getPostId, post.getId()).eq(CommunityComment::getStatus, CommunityPostStatusEnum.PUBLISHED.getCode())
                    .orderByDesc(CommunityComment::getCreateTime))) {
                users.putIfAbsent(item.getAuthorId(), item.getCreateTime());
                summaries.putIfAbsent(item.getAuthorId(), item.getContent());
            }
        } else {
            throw error("unsupported_interactor_type");
        }
        List<CommunityRelationUserVO> records = users.entrySet().stream()
                .map(item -> toRelationUser(userId, item.getKey(), item.getValue(), summaries.get(item.getKey())))
                .filter(Objects::nonNull).toList();
        return slice(records, page, size);
    }

    @Override
    public Page<CommunityRelationUserVO> getHiddenAuthors(Long userId, int page, int size) {
        List<CommunityRelationUserVO> records = communityExtensionDao.selectPreferences(new LambdaQueryWrapper<CommunityContentPreference>()
                        .eq(CommunityContentPreference::getUserId, userId)
                        .eq(CommunityContentPreference::getActionType, "hide_author_posts")
                        .eq(CommunityContentPreference::getStatus, "enabled")
                        .orderByDesc(CommunityContentPreference::getUpdateTime))
                .stream().map(item -> toRelationUser(userId, item.getTargetUserId(), item.getUpdateTime(), null))
                .filter(Objects::nonNull).toList();
        return slice(records, page, size);
    }

    @Override
    @Transactional
    public CommunityAuthorPreferenceResultVO hideAuthor(Long userId, String targetUserRef) {
        return setAuthorHidden(userId, resolveUserRef(targetUserRef), true);
    }

    @Override
    @Transactional
    public CommunityAuthorPreferenceResultVO unhideAuthor(Long userId, String targetUserRef) {
        return setAuthorHidden(userId, resolveUserRef(targetUserRef), false);
    }

    @Override
    public CommunityProfileSummaryVO getProfileSummary(Long userId) {
        AppUser user = requireUser(userId);
        CommunityProfileSummaryVO result = new CommunityProfileSummaryVO();
        result.setNickname(user.getNickname());
        result.setAvatar(auditContentService.publicAvatar(userId));
        result.setDescription(profileDescription(user));
        CommunityProfileSummaryVO.Stats stats = new CommunityProfileSummaryVO.Stats();
        List<CommunityPost> ownPosts = communityPostDao.selectList(new LambdaQueryWrapper<CommunityPost>()
                .eq(CommunityPost::getAuthorId, userId).notIn(CommunityPost::getStatus, List.of("deleted", "blocked")));
        stats.setPostCount((long) ownPosts.size());
        stats.setFollowingCount((long) communityFollowDao.selectList(new LambdaQueryWrapper<CommunityFollow>()
                .eq(CommunityFollow::getFollowerId, userId).eq(CommunityFollow::getStatus, CommunityFollowStatusEnum.FOLLOW.getCode())).size());
        stats.setFollowerCount((long) communityFollowDao.selectList(new LambdaQueryWrapper<CommunityFollow>()
                .eq(CommunityFollow::getTargetUserId, userId).eq(CommunityFollow::getStatus, CommunityFollowStatusEnum.FOLLOW.getCode())).size());
        long postLikes = ownPosts.stream().mapToLong(item -> defaultZero(item.getLikeCount())).sum();
        List<Long> commentIds = communityCommentDao.selectList(new LambdaQueryWrapper<CommunityComment>()
                        .eq(CommunityComment::getAuthorId, userId)).stream().map(CommunityComment::getId).toList();
        long commentLikes = commentIds.isEmpty() ? 0 : communityExtensionDao.selectCommentLikes(new LambdaQueryWrapper<CommunityCommentLike>()
                .in(CommunityCommentLike::getCommentId, commentIds).eq(CommunityCommentLike::getStatus, "enabled")).size();
        stats.setReceivedLikeCount(postLikes + commentLikes);
        result.setStats(stats);
        return result;
    }

    @Override
    @Transactional
    public CommunityLikeToggleVO toggleCommentLike(Long userId, String commentRef) {
        ensureCommunityWriteAllowed(userId, "comment_like");
        CommunityComment comment = requireCommentRef(commentRef);
        CommunityCommentLike relation = communityExtensionDao.selectCommentLikeOne(new LambdaQueryWrapper<CommunityCommentLike>()
                .eq(CommunityCommentLike::getCommentId, comment.getId()).eq(CommunityCommentLike::getUserId, userId));
        boolean liked;
        int count = defaultZero(comment.getLikeCount());
        if (relation == null) {
            relation = new CommunityCommentLike();
            relation.setCommentId(comment.getId());
            relation.setUserId(userId);
            relation.setStatus("enabled");
            relation.setActiveMarker(1);
            communityExtensionDao.insertCommentLike(relation);
            liked = true;
            count++;
        } else {
            liked = !"enabled".equals(relation.getStatus());
            relation.setStatus(liked ? "enabled" : "disabled");
            relation.setActiveMarker(liked ? 1 : null);
            communityExtensionDao.updateCommentLike(relation);
            count = Math.max(0, count + (liked ? 1 : -1));
        }
        comment.setLikeCount(count);
        communityCommentDao.updateById(comment);
        CommunityLikeToggleVO result = new CommunityLikeToggleVO();
        result.setLiked(liked);
        result.setLikeCount(count);
        return result;
    }

    /**
     * 获取社区公共配置
     *
     * @return 社区配置（交互门槛/发布限制/首页标签等）
     */
    @Override
    public CommunityConfigVO getConfig() {
        Map<String, AppConfig> configMap = appConfigDao.selectPublicEnabled(List.of(
                CommunityConfigKeys.INTERACTION_GATE_MODE,
                CommunityConfigKeys.POST_MAX_IMAGES,
                CommunityConfigKeys.POST_MAX_TEXT_LENGTH,
                CommunityConfigKeys.POST_MAX_MENTIONS,
                CommunityConfigKeys.SINCERE_POST_MIN_TEXT_LENGTH,
                CommunityConfigKeys.CONTACT_INFO_ALLOWED,
                CommunityConfigKeys.REPORT_ENTRY_ENABLED
        )).stream().collect(Collectors.toMap(AppConfig::getConfigKey, item -> item, (a, b) -> a));

        CommunityConfigVO vo = new CommunityConfigVO();
        vo.setInteractionGateMode(requiredConfigValue(configMap, CommunityConfigKeys.INTERACTION_GATE_MODE));
        vo.setPostMaxImages(requiredConfigInt(configMap, CommunityConfigKeys.POST_MAX_IMAGES));
        vo.setPostMaxTextLength(requiredConfigInt(configMap, CommunityConfigKeys.POST_MAX_TEXT_LENGTH));
        vo.setPostMaxMentions(requiredConfigInt(configMap, CommunityConfigKeys.POST_MAX_MENTIONS));
        vo.setSincerePostMinTextLength(requiredConfigInt(configMap, CommunityConfigKeys.SINCERE_POST_MIN_TEXT_LENGTH));
        vo.setContactInfoAllowed(requiredConfigBool(configMap, CommunityConfigKeys.CONTACT_INFO_ALLOWED));
        vo.setReportEntryEnabled(requiredConfigBool(configMap, CommunityConfigKeys.REPORT_ENTRY_ENABLED));
        vo.setHomeTabs(mobileEntryConfigDao.selectEnabledByPageCode(MobilePageCodeEnum.COMMUNITY_HOME_TAB.getCode())
                .stream().map(this::toMiniappEntry).toList());
        vo.setTopics(toTopicOptions(enabledTopics()));
        vo.setReportReasons(toDictOptions(dictDataDao.selectByDictType("community_report_reason")));
        return vo;
    }

    private void ensureCommunityWriteAllowed(Long userId, String operation) {
        ensureInteractionAllowed(userId);
        AppUser user = requireUser(userId);
        if (AccountStatusEnum.FROZEN.getCode().equals(user.getAccountStatus())
                || AccountStatusEnum.CANCELLED.getCode().equals(user.getAccountStatus())) {
            throw error(505002, "account_abnormal");
        }
        LocalDateTime now = LocalDateTime.now();
        boolean muted = communityExtensionDao.selectRestrictions(new LambdaQueryWrapper<CommunityUserRestriction>()
                        .eq(CommunityUserRestriction::getUserId, userId)
                        .eq(CommunityUserRestriction::getRestrictionType, "mute")
                        .eq(CommunityUserRestriction::getStatus, "active")
                        .eq(CommunityUserRestriction::getActiveMarker, 1))
                .stream().anyMatch(item -> item.getEndTime() == null || item.getEndTime().isAfter(now));
        if (muted) throw error(505017, "muted");
        ensureIpAllowed(operation);
    }

    private void ensureReportAllowed(Long userId) {
        AppUser user = requireUser(userId);
        if (AccountStatusEnum.FROZEN.getCode().equals(user.getAccountStatus())
                || AccountStatusEnum.CANCELLED.getCode().equals(user.getAccountStatus())) {
            throw error(505002, "account_abnormal_report");
        }
        ensureIpAllowed("report");
    }

    private void ensureIpAllowed(String operation) {
        String ip = requestIp();
        if (StrUtil.isBlank(ip) || !defaultBool(CommunityConfigKeys.IP_BLOCK_ENABLED, true)) return;
        LocalDateTime now = LocalDateTime.now();
        boolean blocked = communityExtensionDao.selectIpBlocks(new LambdaQueryWrapper<CommunityIpBlock>()
                        .eq(CommunityIpBlock::getStatus, "active")
                        .eq(CommunityIpBlock::getActiveMarker, 1))
                .stream().filter(item -> item.getEndTime() == null || item.getEndTime().isAfter(now))
                .filter(item -> scopeContains(item.getWriteScope(), operation))
                .anyMatch(item -> ipMatches(ip, item.getIpValue(), item.getIpRange()));
        if (blocked) throw error(505018, "ip_blocked");
    }

    private boolean scopeContains(String scope, String operation) {
        return StrUtil.isBlank(scope) || scope.contains("\"" + operation + "\"") || scope.contains(operation);
    }

    private boolean ipMatches(String requestIp, String blockedIp, String range) {
        if (Objects.equals(requestIp, blockedIp)) return true;
        String cidr = StrUtil.isNotBlank(range) ? range : blockedIp;
        if (StrUtil.isBlank(cidr) || !cidr.contains("/") || requestIp.contains(":")) return false;
        try {
            String[] parts = cidr.split("/");
            int prefix = Integer.parseInt(parts[1]);
            long mask = prefix == 0 ? 0 : 0xFFFFFFFFL << (32 - prefix);
            return (ipv4(requestIp) & mask) == (ipv4(parts[0]) & mask);
        } catch (RuntimeException ex) {
            return false;
        }
    }

    private long ipv4(String value) {
        String[] parts = value.split("\\.");
        if (parts.length != 4) throw new IllegalArgumentException("invalid ip");
        long result = 0;
        for (String part : parts) result = (result << 8) | Integer.parseInt(part);
        return result;
    }

    private String requestIp() {
        if (!(RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes)) return null;
        String forwarded = attributes.getRequest().getHeader("X-Forwarded-For");
        if (StrUtil.isNotBlank(forwarded)) return forwarded.split(",")[0].trim();
        return attributes.getRequest().getRemoteAddr();
    }

    private String businessNo(String prefix) {
        return prefix + "-" + IdUtil.fastSimpleUUID().substring(0, 20).toUpperCase(Locale.ROOT);
    }

    private void writeAudit(String bizType, String bizNo, Long bizId, String action,
                            String result, String reason, String providerCode) {
        CommunityAuditRecord record = new CommunityAuditRecord();
        record.setBizType(bizType);
        record.setBizNo(bizNo);
        record.setBizId(bizId);
        record.setAction(action);
        record.setResult(StrUtil.blankToDefault(result, "unknown"));
        record.setReason(reason);
        record.setProviderCode(providerCode);
        record.setOperatorId(UserContextHolder.get() == null ? null : UserContextHolder.get().getId());
        record.setOperatorIp(requestIp());
        communityExtensionDao.insertAudit(record);
    }

    private void writeOutbox(String eventType, String aggregateType, String aggregateNo,
                             Integer aggregateVersion, String payload) {
        CommunityEventOutbox event = new CommunityEventOutbox();
        event.setEventNo(businessNo("EVT"));
        event.setEventType(eventType);
        event.setAggregateType(aggregateType);
        event.setAggregateNo(aggregateNo);
        event.setAggregateVersion(aggregateVersion == null ? 0 : aggregateVersion);
        event.setPayload(payload);
        event.setStatus("pending");
        event.setRetryCount(0);
        communityExtensionDao.insertOutbox(event);
    }

    private void persistMediaAuditTasks(CommunityPost post, List<String> imageUrls, String machineCode) {
        if (StrUtil.isBlank(machineCode) || !machineCode.startsWith("media_async:")
                || imageUrls == null || imageUrls.isEmpty()) return;
        List<String> traces = Arrays.stream(machineCode.substring("media_async:".length()).split(","))
                .filter(StrUtil::isNotBlank).toList();
        if (traces.size() != imageUrls.size()) {
            post.setStatus(CommunityPostStatusEnum.PENDING_MANUAL.getCode());
            post.setMachineResult("unavailable");
            post.setMachineDetail("media_trace_count_mismatch");
            communityPostDao.updateById(post);
            return;
        }
        for (int index = 0; index < traces.size(); index++) {
            CommunityMediaAuditTask task = new CommunityMediaAuditTask();
            task.setPostId(post.getId());
            task.setPostNo(post.getPostNo());
            task.setTraceId(traces.get(index));
            task.setMediaUrl(imageUrls.get(index));
            task.setStatus("pending");
            task.setVersion(0);
            communityExtensionDao.insertMediaTask(task);
        }
    }

    private String resolveStatusLabel(String dictType, String code) {
        if (StrUtil.isBlank(code)) return null;
        List<SysDictData> values = dictDataDao.selectByDictType(dictType);
        if (values == null) return code;
        return values.stream().filter(item -> code.equalsIgnoreCase(item.getDictValue()))
                .map(SysDictData::getDictLabel).findFirst().orElse(code);
    }

    private String copy(String key, String fallback) {
        AppConfig item = appConfigDao.selectByKey(CommunityConfigKeys.COPY_PREFIX + key);
        return item == null || StrUtil.isBlank(item.getConfigValue()) ? fallback : item.getConfigValue();
    }

    /** 读取动态文案；缺失时返回稳定键，禁止退回硬编码展示文案。 */
    private String message(String key, Object... args) {
        AppConfig item = appConfigDao.selectByKey(CommunityConfigKeys.COPY_PREFIX + key);
        String template = item == null || StrUtil.isBlank(item.getConfigValue()) ? key : item.getConfigValue();
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

    private BusinessException error(int code, String key) {
        return new BusinessException(code, message(key));
    }

    private boolean defaultBool(String key, boolean fallback) {
        AppConfig item = appConfigDao.selectByKey(key);
        return item == null || StrUtil.isBlank(item.getConfigValue()) ? fallback : Boolean.parseBoolean(item.getConfigValue());
    }

    private void validateOwnedImageUrls(Long userId, List<String> imageUrls) {
        if (imageUrls == null) return;
        String endpoint = ossConfig.getEndpoint();
        String bucket = ossConfig.getBucketName();
        String cdn = ossConfig.getCdnDomain();
        for (String url : imageUrls) {
            if (StrUtil.isBlank(url) || !url.startsWith("https://") || url.contains("?")) {
                throw error(505019, "image_upload_invalid");
            }
            String key;
            try {
                key = URI.create(url).getPath().replaceFirst("^/", "");
            } catch (RuntimeException ex) {
                throw error(505019, "image_upload_invalid");
            }
            if (!key.startsWith("miniapp/" + userId + "/")) {
                throw error(505019, "image_not_owned");
            }
            String ticketOwner = redisTemplate.opsForValue().get("community:upload:ticket:" + key);
            if (StrUtil.isNotBlank(ticketOwner) && !String.valueOf(userId).equals(ticketOwner)) {
                throw error(505019, "image_not_owned");
            }
            if (!ossUtil.objectExists(key)) throw error(505019, "image_upload_invalid");
            if (StrUtil.isNotBlank(endpoint) && StrUtil.isNotBlank(bucket)) {
                String expectedHost = bucket + "." + endpoint.replaceFirst("^https?://", "").replaceFirst("/$", "");
                String cdnHost = StrUtil.blankToDefault(cdn, "").replaceFirst("^https?://", "").replaceFirst("/$", "");
                if (!url.contains(expectedHost) && (cdnHost.isBlank() || !url.contains(cdnHost))) {
                    throw error(505019, "image_not_owned");
                }
            }
        }
    }

    private void consumeUploadTickets(List<String> imageUrls) {
        if (imageUrls == null) return;
        for (String url : imageUrls) {
            String key = URI.create(url).getPath().replaceFirst("^/", "");
            redisTemplate.delete("community:upload:ticket:" + key);
        }
    }

    private CommunityPost requirePostRef(String ref) {
        if (StrUtil.isBlank(ref)) throw error("content_not_found");
        if (ref.chars().allMatch(Character::isDigit)) return requirePost(Long.parseLong(ref));
        List<CommunityPost> values = communityPostDao.selectList(new LambdaQueryWrapper<CommunityPost>()
                .eq(CommunityPost::getPostNo, ref).last("LIMIT 1"));
        if (values == null || values.isEmpty()) throw error("content_not_found");
        return values.get(0);
    }

    private CommunityComment requireCommentRef(String ref) {
        if (StrUtil.isBlank(ref)) throw error("comment_not_found");
        if (ref.chars().allMatch(Character::isDigit)) return requireComment(Long.parseLong(ref));
        List<CommunityComment> values = communityCommentDao.selectList(new LambdaQueryWrapper<CommunityComment>()
                .eq(CommunityComment::getCommentNo, ref).last("LIMIT 1"));
        if (values == null || values.isEmpty()) throw error("comment_not_found");
        return values.get(0);
    }

    private Long numericId(String ref) {
        try {
            return Long.parseLong(ref);
        } catch (NumberFormatException ex) {
            throw error("user_reference_invalid");
        }
    }

    private Long resolveUserRef(String ref) {
        if (StrUtil.isBlank(ref)) throw error("user_not_found");
        if (ref.chars().allMatch(Character::isDigit)) return Long.parseLong(ref);
        if (ref.startsWith("USR-")) {
            try { return Long.parseLong(ref.substring(4)); } catch (NumberFormatException ignored) { }
        }
        throw error("user_reference_invalid");
    }

    private String userNo(Long userId) {
        return userId == null ? null : "USR-" + String.format(Locale.ROOT, "%012d", userId);
    }

    private String jsonSafe(String value) {
        return value == null ? "" : value.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private String normalizeContentType(String contentType) {
        String normalized = "community".equals(contentType) || "normal_post".equals(contentType)
                ? "community_post" : contentType;
        if (!Set.of("community_post", "sincere_post").contains(normalized)) {
            throw error("unsupported_content_type");
        }
        return normalized;
    }

    private SysDictData toLegacyTopic(CommunityTopic topic) {
        SysDictData value = new SysDictData();
        value.setId(topic.getId());
        value.setDictType("community_topic");
        value.setDictValue(topic.getTopicCode());
        value.setDictLabel(topic.getTopicName());
        value.setDictSort(topic.getSort());
        value.setRemark(topic.getDescription());
        value.setStatus("enabled".equalsIgnoreCase(topic.getStatus()) ? CommonStatusEnum.ENABLED.getCode() : CommonStatusEnum.DISABLED.getCode());
        return value;
    }

    private List<String> draftImageUrls(CommunityDraftSaveReq req) {
        if (req.getImages() != null) {
            return req.getImages().stream().map(CommunityDraftSaveReq.ImageItem::getUrl).filter(StrUtil::isNotBlank).toList();
        }
        return req.getImageUrls() == null ? List.of() : req.getImageUrls();
    }

    private void fillDraft(CommunityPostDraft entity, CommunityDraftSaveReq req, List<String> imageUrls) {
        entity.setContent(StrUtil.blankToDefault(StrUtil.trim(req.getContent()), null));
        entity.setImageItems(toJsonList(imageUrls));
        entity.setTopicId(req.getTopicId());
        CommunityTopic topic = req.getTopicId() == null ? null : communityExtensionDao.selectTopicById(req.getTopicId());
        entity.setTopicCode(topic == null ? null : topic.getTopicCode());
    }

    private CommunityDraftVO toDraftVO(CommunityPostDraft entity) {
        CommunityDraftVO result = new CommunityDraftVO();
        result.setDraftId(entity.getId());
        result.setContentType(entity.getContentType());
        result.setContent(entity.getContent());
        result.setImageUrls(parseJsonList(entity.getImageItems()));
        result.setImages(result.getImageUrls().stream().map(url -> {
            CommunityDraftVO.ImageItem image = new CommunityDraftVO.ImageItem();
            image.setUrl(url);
            return image;
        }).toList());
        result.setTopicId(entity.getTopicId());
        result.setTopicCode(entity.getTopicCode());
        CommunityTopic topic = entity.getTopicId() == null ? null : communityExtensionDao.selectTopicById(entity.getTopicId());
        result.setTopicName(topic == null ? null : topic.getTopicName());
        result.setVersion(entity.getVersion());
        result.setUpdateTime(formatTime(entity.getUpdateTime()));
        return result;
    }

    private CommunityInteractionRecordVO interactionRecord(String type, String id, LocalDateTime time,
                                                            Long currentUserId, CommunityPost post) {
        CommunityInteractionRecordVO result = new CommunityInteractionRecordVO();
        result.setId(id);
        result.setInteractionType(type);
        result.setTargetUserId(post.getAuthorId());
        result.setTargetUserNo(userNo(post.getAuthorId()));
        AppUser author = appUserDao.selectById(post.getAuthorId());
        result.setNickname(author == null ? null : author.getNickname());
        result.setAvatar(auditContentService.publicAvatar(post.getAuthorId()));
        result.setDescription(author == null ? null : profileDescription(author));
        result.setInteractionTime(formatTime(time));
        result.setPost(toPostCard(currentUserId, post));
        return result;
    }

    private CommunityRelationUserVO toRelationUser(Long currentUserId, Long targetUserId,
                                                    LocalDateTime time, String commentSummary) {
        AppUser target = targetUserId == null ? null : appUserDao.selectById(targetUserId);
        if (target == null) return null;
        CommunityRelationUserVO result = new CommunityRelationUserVO();
        result.setUserId(targetUserId);
        result.setUserNo(userNo(targetUserId));
        result.setNickname(target.getNickname());
        result.setAvatar(auditContentService.publicAvatar(targetUserId));
        result.setDescription(profileDescription(target));
        boolean following = currentUserId != null && isFollowing(currentUserId, targetUserId);
        result.setFollowing(following);
        result.setMutualFollowing(following && isFollowing(targetUserId, currentUserId));
        result.setInteractionTime(formatTime(time));
        result.setCommentSummary(commentSummary);
        return result;
    }

    private CommunityAuthorPreferenceResultVO setAuthorHidden(Long userId, Long targetUserId, boolean hidden) {
        requireUser(userId);
        requireUser(targetUserId);
        if (Objects.equals(userId, targetUserId)) throw error("cannot_hide_self");
        CommunityContentPreference entity = communityExtensionDao.selectPreferenceOne(new LambdaQueryWrapper<CommunityContentPreference>()
                .eq(CommunityContentPreference::getUserId, userId)
                .eq(CommunityContentPreference::getTargetUserId, targetUserId)
                .eq(CommunityContentPreference::getActionType, "hide_author_posts"));
        if (entity == null) {
            entity = new CommunityContentPreference();
            entity.setUserId(userId);
            entity.setTargetUserId(targetUserId);
            entity.setActionType("hide_author_posts");
            entity.setStatus(hidden ? "enabled" : "disabled");
            communityExtensionDao.insertPreference(entity);
        } else {
            entity.setStatus(hidden ? "enabled" : "disabled");
            communityExtensionDao.updatePreference(entity);
        }
        writeOutbox("content_preference_changed", "user", userNo(targetUserId), hidden ? 1 : 0,
                "{\"targetUserId\":" + targetUserId + ",\"hidden\":" + hidden + "}");
        return new CommunityAuthorPreferenceResultVO(userNo(targetUserId), hidden,
                message(hidden ? "author_hidden" : "author_unhidden"));
    }

    private boolean isAuthorHidden(Long userId, Long targetUserId) {
        CommunityContentPreference value = communityExtensionDao.selectPreferenceOne(new LambdaQueryWrapper<CommunityContentPreference>()
                .eq(CommunityContentPreference::getUserId, userId)
                .eq(CommunityContentPreference::getTargetUserId, targetUserId)
                .eq(CommunityContentPreference::getActionType, "hide_author_posts"));
        return value != null && "enabled".equals(value.getStatus());
    }

    private String profileDescription(AppUser user) {
        return java.util.stream.Stream.of(user.getAge() == null ? null : message("age_years", user.getAge()),
                        user.getLocationCity(), user.getOccupation())
                .filter(StrUtil::isNotBlank).collect(Collectors.joining(" · "));
    }

    private String formatTime(LocalDateTime value) {
        return value == null ? null : value.format(FMT);
    }

    private int safePage(int page) { return Math.max(1, page); }
    private int safeSize(int size, int max) { return Math.max(1, Math.min(size, max)); }

    private <T> Page<T> slice(List<T> values, int page, int size) {
        List<T> safe = values == null ? List.of() : values;
        int current = safePage(page);
        int limit = safeSize(size, 100);
        int start = Math.min((current - 1) * limit, safe.size());
        int end = Math.min(start + limit, safe.size());
        Page<T> result = new Page<>(current, limit, safe.size());
        result.setRecords(new ArrayList<>(safe.subList(start, end)));
        return result;
    }

    private Object parseConfigValue(String value, String type) {
        if (value == null) return null;
        if ("BOOLEAN".equalsIgnoreCase(type)) return Boolean.parseBoolean(value);
        if ("NUMBER".equalsIgnoreCase(type)) {
            try { return Integer.parseInt(value); } catch (NumberFormatException ignored) { return value; }
        }
        return value;
    }

    private List<DictOptionVO> toDictOptions(List<SysDictData> items) {
        if (items == null) return List.of();
        Map<String, SysDictData> unique = items.stream()
                .filter(item -> CommonStatusEnum.ENABLED.getCode().equals(item.getStatus()))
                .sorted(Comparator.comparing(item -> Optional.ofNullable(item.getDictSort()).orElse(Integer.MAX_VALUE)))
                .collect(Collectors.toMap(SysDictData::getDictValue, item -> item, (first, ignored) -> first, LinkedHashMap::new));
        return unique.values().stream().map(item -> {
                    DictOptionVO option = new DictOptionVO();
                    option.setCode(item.getDictValue());
                    option.setLabel(item.getDictLabel());
                    option.setSort(item.getDictSort());
                    return option;
                }).toList();
    }

    private List<DictOptionVO> toTopicOptions(List<SysDictData> items) {
        if (items == null) return List.of();
        Map<String, SysDictData> unique = items.stream()
                .filter(item -> CommonStatusEnum.ENABLED.getCode().equals(item.getStatus()))
                .sorted(Comparator.comparing(item -> Optional.ofNullable(item.getDictSort()).orElse(Integer.MAX_VALUE)))
                .collect(Collectors.toMap(SysDictData::getDictValue, item -> item, (first, ignored) -> first, LinkedHashMap::new));
        return unique.values().stream().map(item -> {
                    DictOptionVO option = new DictOptionVO();
                    option.setCode(String.valueOf(item.getId()));
                    option.setLabel(item.getDictLabel());
                    option.setSort(item.getDictSort());
                    return option;
                }).toList();
    }

    private List<SysDictData> enabledTopics() {
        List<CommunityTopic> formalTopics = communityExtensionDao.selectTopics(new LambdaQueryWrapper<CommunityTopic>()
                .eq(CommunityTopic::getStatus, "enabled")
                .orderByDesc(CommunityTopic::getRecommended)
                .orderByAsc(CommunityTopic::getSort));
        return formalTopics == null ? List.of() : formalTopics.stream().map(this::toLegacyTopic).toList();
    }

    private Map<Long, List<CommunityPost>> publishedPostsByTopic() {
        List<CommunityPost> posts = communityPostDao.selectList(new LambdaQueryWrapper<CommunityPost>()
                .eq(CommunityPost::getStatus, CommunityPostStatusEnum.PUBLISHED.getCode())
                .isNotNull(CommunityPost::getTopicId));
        if (posts == null) return Map.of();
        return posts.stream()
                .filter(item -> item.getTopicId() != null)
                .collect(Collectors.groupingBy(CommunityPost::getTopicId));
    }

    private CommunityTopicCardVO toTopicCard(SysDictData topic, List<CommunityPost> posts) {
        List<CommunityPost> safePosts = posts == null ? List.of() : posts;
        CommunityPost preview = safePosts.stream()
                .max(Comparator
                        .comparingInt((CommunityPost item) -> defaultZero(item.getLikeCount()) + defaultZero(item.getCommentCount()))
                        .thenComparing(item -> Optional.ofNullable(item.getCreateTime()).orElse(LocalDateTime.MIN)))
                .orElse(null);
        CommunityTopicCardVO result = new CommunityTopicCardVO();
        result.setId(topic.getId());
        result.setTopicCode(topic.getDictValue());
        result.setName(topic.getDictLabel());
        result.setDescription(topicDescription(topic));
        CommunityTopic formal = communityExtensionDao.selectTopicById(topic.getId());
        result.setCoverUrl(formal == null ? null : formal.getCoverUrl());
        result.setPostCount((long) safePosts.size());
        result.setParticipantCount(safePosts.stream()
                .map(CommunityPost::getAuthorId)
                .filter(Objects::nonNull)
                .distinct()
                .count());
        result.setParticipantAvatars(safePosts.stream()
                .map(CommunityPost::getAuthorId)
                .filter(Objects::nonNull)
                .distinct()
                .limit(5)
                .map(auditContentService::publicAvatar)
                .filter(StrUtil::isNotBlank)
                .toList());
        if (preview != null) {
            AppUser author = appUserDao.selectById(preview.getAuthorId());
            List<String> images = parseJsonList(preview.getImageUrls());
            result.setPreviewContent(preview.getContent());
            result.setPreviewImageUrl(images.isEmpty() ? null : images.get(0));
            result.setPreviewAuthorId(preview.getAuthorId());
            result.setPreviewAuthorName(author != null ? author.getNickname() : null);
            result.setPreviewAuthorAvatar(auditContentService.publicAvatar(preview.getAuthorId()));
            result.setPreviewCreateTime(preview.getCreateTime() != null ? preview.getCreateTime().format(FMT) : null);
        }
        return result;
    }

    private String topicDescription(SysDictData topic) {
        return StrUtil.blankToDefault(topic.getRemark(), message("topic_default_description"));
    }

    /**
     * 校验用户交互权限（根据交互门槛模式判断是否允许交互）
     *
     * @param userId 用户ID
     */
    private void ensureInteractionAllowed(Long userId) {
        requireUser(userId);
        String mode = requiredConfigValue(CommunityConfigKeys.INTERACTION_GATE_MODE);
        if (CommunityGateModeEnum.getByCode(mode) == null) {
            throw error("runtime_config_invalid");
        }
        if (CommunityGateModeEnum.FULL_CERT.getCode().equals(mode)) {
            String accessStatus = accessEvaluator.evaluate(requireUser(userId)).getCoreAccessStatus();
            if (!"CORE_ALLOWED".equals(accessStatus)) {
                throw error("core_access_required");
            }
        }
    }

    /**
     * 校验内容发布请求参数（类型/图片数量/正文长度/@用户数量/诚意贴要求）
     *
     * @param req 内容发布请求
     */
    private void validatePostRequest(Long userId, CommunityPostCreateReq req) {
        CommunityPostTypeEnum postType = CommunityPostTypeEnum.getByCode(req.resolvedContentType());
        if (postType == null) {
            throw error("unsupported_content_type");
        }
        requireTopic(req.getTopicId());

        int maxImages = requiredConfigInt(CommunityConfigKeys.POST_MAX_IMAGES);
        int maxTextLength = requiredConfigInt(CommunityConfigKeys.POST_MAX_TEXT_LENGTH);

        if (req.getImageUrls() != null && req.getImageUrls().size() > maxImages) {
            throw new BusinessException(message("image_count_exceeded", maxImages));
        }
        validateOwnedImageUrls(userId, req.getImageUrls());
        if (StrUtil.length(req.getContent()) > maxTextLength) {
            throw new BusinessException(message("text_length_exceeded", maxTextLength));
        }
    }

    /**
     * 根据ID查询内容，不存在则抛出异常
     *
     * @param id 内容ID
     * @return 社区内容实体
     */
    private CommunityPost requirePost(Long id) {
        CommunityPost post = communityPostDao.selectById(id);
        if (post == null) {
            throw error("content_not_found");
        }
        return post;
    }

    /**
     * 根据ID查询评论，不存在则抛出异常
     *
     * @param id 评论ID
     * @return 社区评论实体
     */
    private CommunityComment requireComment(Long id) {
        CommunityComment comment = communityCommentDao.selectById(id);
        if (comment == null) {
            throw error("comment_not_found");
        }
        return comment;
    }

    /**
     * 根据ID查询用户，不存在则抛出异常
     *
     * @param userId 用户ID
     * @return 系统用户实体
     */
    private AppUser requireUser(Long userId) {
        AppUser user = appUserDao.selectById(userId);
        if (user == null) {
            throw error("user_not_found");
        }
        return user;
    }

    /**
     * 校验话题ID存在且类型正确
     *
     * @param topicId 话题ID
     */
    private void requireTopic(Long topicId) {
        requireTopicEntity(topicId);
    }

    private SysDictData requireTopicEntity(Long topicId) {
        CommunityTopic topic = topicId == null ? null : communityExtensionDao.selectTopicById(topicId);
        if (topic == null || !"enabled".equalsIgnoreCase(topic.getStatus())) {
            throw error("topic_not_found");
        }
        return toLegacyTopic(topic);
    }

    /**
     * 校验举报原因代码在字典中合法存在
     *
     * @param reasonCode 举报原因代码
     */
    private void requireReportReason(String reasonCode) {
        List<SysDictData> items = dictDataDao.selectByDictType("community_report_reason");
        boolean exists = items.stream().anyMatch(item -> reasonCode.equals(item.getDictValue()));
        if (!exists) {
            throw error("report_reason_not_found");
        }
    }

    /**
     * 根据举报目标类型增加被举报计数（内容/评论）
     *
     * @param targetType 举报目标类型
     * @param targetId   目标ID
     */
    private Long increaseReportCount(String targetType, String targetId) {
        if (CommunityReportTargetTypeEnum.POST.getCode().equals(targetType)) {
            CommunityPost post = requirePostRef(targetId);
            post.setReportCount((post.getReportCount() == null ? 0 : post.getReportCount()) + 1);
            communityPostDao.updateById(post);
            return post.getAuthorId();
        }
        if (CommunityReportTargetTypeEnum.COMMENT.getCode().equals(targetType)) {
            CommunityComment comment = requireCommentRef(targetId);
            comment.setReportCount((comment.getReportCount() == null ? 0 : comment.getReportCount()) + 1);
            communityCommentDao.updateById(comment);
            return comment.getAuthorId();
        }
        Long userId = numericId(targetId);
        requireUser(userId);
        return userId;
    }

    /**
     * 将内容分页实体转换为卡片VO分页
     *
     * @param userId 当前用户ID（可选）
     * @param page   内容分页实体
     * @return 卡片VO分页
     */
    private Page<CommunityPostCardVO> toPostCardPage(Long userId, Page<CommunityPost> page) {
        Page<CommunityPostCardVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(page.getRecords().stream().map(post -> toPostCard(userId, post)).toList());
        return result;
    }

    /**
     * 将社区内容实体转换为卡片VO（含作者信息、点赞/关注状态）
     *
     * @param userId 当前用户ID（可选）
     * @param post   内容实体
     * @return 内容卡片VO
     */
    private CommunityPostCardVO toPostCard(Long userId, CommunityPost post) {
        CommunityPostCardVO vo = new CommunityPostCardVO();
        AppUser author = appUserDao.selectById(post.getAuthorId());
        vo.setId(post.getId());
        vo.setPostNo(post.getPostNo());
        vo.setAuthorId(post.getAuthorId());
        vo.setAuthorUserNo(userNo(post.getAuthorId()));
        vo.setAuthorName(author != null ? author.getNickname() : null);
        vo.setAuthorAvatar(auditContentService.publicAvatar(post.getAuthorId()));
        if (author != null) {
            vo.setAuthorGender(author.getGender());
            vo.setAuthorAge(author.getAge());
            vo.setAuthorCity(author.getLocationCity());
            vo.setAuthorZodiac(author.getZodiac());
            vo.setAuthorAnnualIncome(author.getAnnualIncome());
            vo.setAuthorProfession(author.getOccupation());
        }
        vo.setPostType(post.getPostType());
        vo.setContentType(post.getPostType());
        vo.setTitle(post.getTitle());
        vo.setContent(post.getContent());
        vo.setImageUrls(parseJsonList(post.getImageUrls()));
        vo.setTopicId(post.getTopicId());
        vo.setTopicCode(post.getTopicCode());
        vo.setTopicName(resolveTopicName(post.getTopicId()));
        vo.setLikeCount(defaultZero(post.getLikeCount()));
        vo.setCommentCount(defaultZero(post.getCommentCount()));
        vo.setReportCount(defaultZero(post.getReportCount()));
        vo.setLiked(userId != null && isLiked(userId, post.getId()));
        vo.setFollowingAuthor(userId != null && isFollowing(userId, post.getAuthorId()));
        vo.setHiddenAuthor(userId != null && isAuthorHidden(userId, post.getAuthorId()));
        vo.setStatus(post.getStatus());
        vo.setStatusName(resolveStatusLabel("community_content_status", post.getStatus()));
        vo.setStatusMessage(copy("publish_" + post.getStatus(), vo.getStatusName()));
        vo.setAuditStatus(post.getAuditStatus());
        vo.setAuditRemark(post.getAuditRemark());
        vo.setCreateTime(post.getCreateTime() != null ? post.getCreateTime().format(FMT) : null);
        return vo;
    }

    /**
     * 将社区内容实体填充到详情VO（含作者信息、点赞/关注状态、@提及用户列表）
     *
     * @param vo     详情VO（会被填充）
     * @param userId 当前用户ID（可选）
     * @param post   内容实体
     */
    private void fillPostDetail(CommunityPostDetailVO vo, Long userId, CommunityPost post) {
        AppUser author = appUserDao.selectById(post.getAuthorId());
        vo.setId(post.getId());
        vo.setPostNo(post.getPostNo());
        vo.setAuthorId(post.getAuthorId());
        vo.setAuthorUserNo(userNo(post.getAuthorId()));
        vo.setAuthorName(author != null ? author.getNickname() : null);
        vo.setAuthorAvatar(auditContentService.publicAvatar(post.getAuthorId()));
        vo.setPostType(post.getPostType());
        vo.setContentType(post.getPostType());
        vo.setTitle(post.getTitle());
        vo.setContent(post.getContent());
        vo.setImageUrls(parseJsonList(post.getImageUrls()));
        vo.setTopicId(post.getTopicId());
        vo.setTopicCode(post.getTopicCode());
        vo.setTopicName(resolveTopicName(post.getTopicId()));
        vo.setMentionUserIds(parseIdString(post.getMentionUserIds()));
        vo.setLikeCount(defaultZero(post.getLikeCount()));
        vo.setCommentCount(defaultZero(post.getCommentCount()));
        vo.setReportCount(defaultZero(post.getReportCount()));
        vo.setLiked(userId != null && isLiked(userId, post.getId()));
        vo.setFollowingAuthor(userId != null && isFollowing(userId, post.getAuthorId()));
        vo.setHiddenAuthor(userId != null && isAuthorHidden(userId, post.getAuthorId()));
        vo.setStatus(post.getStatus());
        vo.setStatusName(resolveStatusLabel("community_content_status", post.getStatus()));
        vo.setStatusMessage(copy("publish_" + post.getStatus(), vo.getStatusName()));
        vo.setAuditStatus(post.getAuditStatus());
        vo.setAuditRemark(post.getAuditRemark());
        vo.setCreateTime(post.getCreateTime() != null ? post.getCreateTime().format(FMT) : null);
    }

    /**
     * 将评论分页实体转换为VO分页
     *
     * @param userId 当前用户ID（可选）
     * @param page   评论分页实体
     * @return 评论VO分页
     */
    private Page<CommunityCommentVO> toCommentPage(Long userId, Page<CommunityComment> page) {
        Page<CommunityCommentVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(page.getRecords().stream().map(item -> toCommentVO(userId, item)).toList());
        return result;
    }

    /**
     * 将评论实体转换为VO（含作者信息、被回复用户信息）
     *
     * @param comment 评论实体
     * @return 评论VO
     */
    private CommunityCommentVO toCommentVO(Long userId, CommunityComment comment) {
        CommunityCommentVO vo = new CommunityCommentVO();
        AppUser author = appUserDao.selectById(comment.getAuthorId());
        AppUser replyUser = comment.getReplyUserId() != null ? appUserDao.selectById(comment.getReplyUserId()) : null;
        vo.setId(comment.getId());
        vo.setCommentNo(comment.getCommentNo());
        vo.setPostId(comment.getPostId());
        CommunityPost post = communityPostDao.selectById(comment.getPostId());
        vo.setPostNo(post == null ? null : post.getPostNo());
        vo.setAuthorId(comment.getAuthorId());
        vo.setAuthorName(author != null ? author.getNickname() : null);
        vo.setAuthorAvatar(auditContentService.publicAvatar(comment.getAuthorId()));
        vo.setParentCommentId(comment.getParentCommentId());
        vo.setReplyUserId(comment.getReplyUserId());
        vo.setReplyUserName(replyUser != null ? replyUser.getNickname() : null);
        vo.setContent(comment.getContent());
        vo.setStatus(comment.getStatus());
        vo.setStatusName(resolveStatusLabel("community_comment_status", comment.getStatus()));
        vo.setLikeCount(defaultZero(comment.getLikeCount()));
        CommunityCommentLike like = userId == null ? null : communityExtensionDao.selectCommentLikeOne(
                new LambdaQueryWrapper<CommunityCommentLike>()
                        .eq(CommunityCommentLike::getCommentId, comment.getId())
                        .eq(CommunityCommentLike::getUserId, userId));
        vo.setLiked(like != null && "enabled".equals(like.getStatus()));
        vo.setAuditStatus(comment.getAuditStatus());
        vo.setCreateTime(comment.getCreateTime() != null ? comment.getCreateTime().format(FMT) : null);
        return vo;
    }

    /**
     * 判断用户是否已点赞某个内容
     *
     * @param userId 用户ID
     * @param postId 内容ID
     * @return true=已点赞，false=未点赞
     */
    private boolean isLiked(Long userId, Long postId) {
        CommunityLike like = communityLikeDao.selectOne(new LambdaQueryWrapper<CommunityLike>()
                .eq(CommunityLike::getUserId, userId)
                .eq(CommunityLike::getPostId, postId));
        return like != null && CommonStatusEnum.ENABLED.getCode().equals(like.getStatus());
    }

    /**
     * 判断用户是否已关注目标用户
     *
     * @param userId       用户ID
     * @param targetUserId 目标用户ID
     * @return true=已关注，false=未关注（自己关注自己返回false）
     */
    private boolean isFollowing(Long userId, Long targetUserId) {
        if (Objects.equals(userId, targetUserId)) {
            return false;
        }
        CommunityFollow follow = communityFollowDao.selectOne(new LambdaQueryWrapper<CommunityFollow>()
                .eq(CommunityFollow::getFollowerId, userId)
                .eq(CommunityFollow::getTargetUserId, targetUserId));
        return follow != null && CommunityFollowStatusEnum.FOLLOW.getCode().equals(follow.getStatus());
    }

    /**
     * 根据话题ID查询话题名称
     *
     * @param topicId 话题ID
     * @return 话题名称，不存在时返回null
     */
    private String resolveTopicName(Long topicId) {
        if (topicId == null) {
            return null;
        }
        CommunityTopic topic = communityExtensionDao.selectTopicById(topicId);
        return topic != null ? topic.getTopicName() : null;
    }

    /**
     * 将字符串列表序列化为JSON数组字符串（如 ["a","b"]）
     *
     * @param values 字符串列表
     * @return JSON数组字符串，空列表返回"[]"
     */
    private String toJsonList(List<String> values) {
        if (values == null || values.isEmpty()) {
            return "[]";
        }
        return values.stream().filter(StrUtil::isNotBlank).map(String::trim)
                .collect(Collectors.joining("\",\"", "[\"", "\"]"))
                .replace("[\"\"]", "[]");
    }

    /**
     * 解析JSON数组字符串为字符串列表
     *
     * @param json JSON数组字符串（如 ["a","b"]）
     * @return 字符串列表，空字符串/空数组返回空列表
     */
    private List<String> parseJsonList(String json) {
        if (StrUtil.isBlank(json) || "[]".equals(json)) {
            return List.of();
        }
        String value = json.trim();
        if (value.startsWith("[") && value.endsWith("]")) {
            value = value.substring(1, value.length() - 1);
        }
        if (StrUtil.isBlank(value)) {
            return List.of();
        }
        return Arrays.stream(value.split(","))
                .map(item -> item.replace("\"", "").trim())
                .filter(StrUtil::isNotBlank)
                .toList();
    }

    /**
     * 将Long ID列表序列化为逗号分隔字符串
     *
     * @param ids ID列表
     * @return 逗号分隔字符串，空列表返回null
     */
    private String toIdString(List<Long> ids) {
        return ids == null || ids.isEmpty()
                ? null
                : ids.stream().filter(Objects::nonNull).map(String::valueOf).collect(Collectors.joining(","));
    }

    /**
     * 解析逗号分隔字符串为Long列表
     *
     * @param value 逗号分隔的ID字符串（如 "1,2,3"）
     * @return Long列表，空字符串返回空列表
     */
    private List<Long> parseIdString(String value) {
        if (StrUtil.isBlank(value)) {
            return List.of();
        }
        return Arrays.stream(value.split(","))
                .filter(StrUtil::isNotBlank)
                .map(String::trim)
                .map(Long::valueOf)
                .toList();
    }

    /**
     * null-safe 转int，null返回0
     *
     * @param value 整数值（可为null）
     * @return 非null值，null时返回0
     */
    private int defaultZero(Integer value) {
        return value == null ? 0 : value;
    }

    /** 从应用配置中读取必填整数值，缺失或格式错误时失败关闭。 */
    private int requiredConfigInt(String key) {
        AppConfig config = appConfigDao.selectByKey(key);
        if (config == null || StrUtil.isBlank(config.getConfigValue())) {
            throw error("runtime_config_missing");
        }
        try {
            return Integer.parseInt(config.getConfigValue().trim());
        } catch (NumberFormatException e) {
            throw error("runtime_config_invalid");
        }
    }

    /** 从单条配置中读取必填字符串值。 */
    private String requiredConfigValue(String key) {
        AppConfig config = appConfigDao.selectByKey(key);
        if (config == null || StrUtil.isBlank(config.getConfigValue())) {
            throw error("runtime_config_missing");
        }
        return config.getConfigValue().trim();
    }

    /** 从批量配置中读取必填字符串值。 */
    private String requiredConfigValue(Map<String, AppConfig> configMap, String key) {
        AppConfig config = configMap.get(key);
        if (config == null || StrUtil.isBlank(config.getConfigValue())) {
            throw error("runtime_config_missing");
        }
        return config.getConfigValue().trim();
    }

    /** 从批量配置中读取必填整数值。 */
    private int requiredConfigInt(Map<String, AppConfig> configMap, String key) {
        AppConfig config = configMap.get(key);
        if (config == null || StrUtil.isBlank(config.getConfigValue())) {
            throw error("runtime_config_missing");
        }
        try {
            return Integer.parseInt(config.getConfigValue().trim());
        } catch (NumberFormatException e) {
            throw error("runtime_config_invalid");
        }
    }

    /** 从批量配置中读取必填布尔值。 */
    private boolean requiredConfigBool(Map<String, AppConfig> configMap, String key) {
        AppConfig config = configMap.get(key);
        if (config == null || StrUtil.isBlank(config.getConfigValue())) {
            throw error("runtime_config_missing");
        }
        String value = config.getConfigValue().trim().toLowerCase(Locale.ROOT);
        if (!"true".equals(value) && !"false".equals(value)) {
            throw error("runtime_config_invalid");
        }
        return Boolean.parseBoolean(value);
    }

    /**
     * 将移动端入口配置实体转换为小程序入口配置VO
     *
     * @param entity 移动端入口配置实体
     * @return 小程序入口配置VO
     */
    private MiniappEntryConfigVO toMiniappEntry(MobileEntryConfig entity) {
        MiniappEntryConfigVO vo = new MiniappEntryConfigVO();
        vo.setEntryKey(entity.getEntryKey());
        vo.setEntryName(entity.getEntryName());
        vo.setIcon(entity.getIcon());
        vo.setJumpType(entity.getJumpType());
        vo.setJumpTarget(entity.getJumpTarget());
        vo.setBadgeText(entity.getBadgeText());
        vo.setBadgeType(entity.getBadgeType());
        vo.setLoginRequired(entity.getLoginRequired());
        vo.setSort(entity.getSort());
        return vo;
    }
}
