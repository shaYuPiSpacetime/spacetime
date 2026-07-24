package com.spacetime.miniapp.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.constant.CommunityConfigKeys;
import com.spacetime.common.dao.*;
import com.spacetime.common.entity.*;
import com.spacetime.common.enums.*;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.miniapp.dto.request.CommunityCommentCreateReq;
import com.spacetime.miniapp.dto.request.CommunityPostCreateReq;
import com.spacetime.miniapp.dto.request.CommunityReportCreateReq;
import com.spacetime.miniapp.dto.response.*;
import com.spacetime.miniapp.service.CommunityService;
import com.spacetime.common.service.AppUserAuditContentService;
import com.spacetime.common.service.RelationDomainService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

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
        result.setName(topic.getDictLabel());
        result.setDescription(topicDescription(topic));
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
            throw new BusinessException("不支持的话题动态排序");
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
        LambdaQueryWrapper<CommunityPost> wrapper = new LambdaQueryWrapper<CommunityPost>()
                .eq(StrUtil.isNotBlank(postType), CommunityPost::getPostType, postType)
                .eq(topicId != null, CommunityPost::getTopicId, topicId)
                .eq(CommunityPost::getStatus, CommunityPostStatusEnum.PUBLISHED.getCode());
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
            throw new BusinessException("不支持的信息流场景");
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
            throw new BusinessException("不能对自己表达心动");
        }
        AppUser target = requireUser(targetUserId);
        if (!AccountStatusEnum.NORMAL.getCode().equals(target.getAccountStatus())) {
            throw new BusinessException("该用户当前不可互动");
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
        card.setNickname(StrUtil.blankToDefault(candidate.getNickname(), "用户"));
        card.setPhotoUrl(photoUrl);
        card.setFateLabel(resolveFateLabel(currentUser, candidate));
        card.setEducationSchool(resolveEducationSchool(candidate));
        card.setOnlineText(resolveOnlineText(candidate.getLastLoginTime()));
        card.setLiked(likedUserIds.contains(candidate.getId()));
        return card;
    }

    private String resolveFateLabel(AppUser currentUser, AppUser candidate) {
        if (StrUtil.isNotBlank(currentUser.getMajor()) && currentUser.getMajor().equals(candidate.getMajor())) {
            return "同专业，超有缘";
        }
        if (StrUtil.isNotBlank(currentUser.getSchool()) && currentUser.getSchool().equals(candidate.getSchool())) {
            return "同校，超有缘";
        }
        Set<String> currentTags = new LinkedHashSet<>(parseJsonList(currentUser.getTags()));
        String commonTag = parseJsonList(candidate.getTags()).stream().filter(currentTags::contains).findFirst().orElse(null);
        return commonTag == null ? "资料契合，很有缘" : "同爱好，超有缘";
    }

    private String resolveEducationSchool(AppUser candidate) {
        String education = switch (StrUtil.blankToDefault(candidate.getEducationLevel(), "").toUpperCase(Locale.ROOT)) {
            case "DOCTOR", "PHD" -> "博士";
            case "MASTER", "POSTGRADUATE" -> "硕士";
            case "BACHELOR", "UNDERGRADUATE" -> "本科";
            case "COLLEGE", "JUNIOR_COLLEGE" -> "大专";
            default -> "";
        };
        if (StrUtil.isBlank(education)) return StrUtil.blankToDefault(candidate.getSchool(), "资料待完善");
        if (StrUtil.isBlank(candidate.getSchool())) return education;
        return education + "·" + candidate.getSchool();
    }

    private String resolveOnlineText(LocalDateTime lastLoginTime) {
        if (lastLoginTime == null) return "暂无在线记录";
        long minutes = Math.max(1, java.time.Duration.between(lastLoginTime, LocalDateTime.now()).toMinutes());
        if (minutes < 60) return minutes + "分钟前在线";
        if (minutes < 1440) return (minutes / 60) + "小时前在线";
        return (minutes / 1440) + "天前在线";
    }

    private void requireLoginForScene(Long userId) {
        if (userId == null) throw new BusinessException(401, "未登录或登录已过期");
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
    public CommunityPostDetailVO getPostDetail(Long userId, Long postId) {
        CommunityPost post = requirePost(postId);
        if (!CommunityPostStatusEnum.PUBLISHED.getCode().equals(post.getStatus())
                && !Objects.equals(userId, post.getAuthorId())) {
            throw new BusinessException("内容不存在或不可见");
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
    public Long createPost(Long userId, CommunityPostCreateReq req) {
        // 1. 校验交互权限
        ensureInteractionAllowed(userId);
        // 2. 校验请求参数
        validatePostRequest(req);

        CommunityPost entity = new CommunityPost();
        entity.setAuthorId(userId);
        entity.setPostType(req.getPostType());
        entity.setTitle(StrUtil.blankToDefault(StrUtil.trim(req.getTitle()), null));
        entity.setContent(StrUtil.trim(req.getContent()));
        entity.setImageUrls(toJsonList(req.getImageUrls()));
        entity.setTopicId(req.getTopicId());
        entity.setMentionUserIds(toIdString(req.getMentionUserIds()));
        entity.setStatus(CommunityPostStatusEnum.PENDING.getCode());
        entity.setAuditStatus(CommunityAuditStatusEnum.PENDING.getCode());
        entity.setLikeCount(0);
        entity.setCommentCount(0);
        entity.setReportCount(0);
        entity.setDeletedByUser(0);
        // 3. 写入数据库
        communityPostDao.insert(entity);
        log.info("发布内容: userId={}, postType={}, postId={}", userId, req.getPostType(), entity.getId());
        return entity.getId();
    }

    /**
     * 删除自己的社区内容（软删除）
     *
     * @param userId 当前用户ID
     * @param postId 内容ID
     */
    @Override
    @Transactional
    public void deletePost(Long userId, Long postId) {
        // 1. 校验内容存在且为本人所发
        CommunityPost post = requirePost(postId);
        if (!Objects.equals(post.getAuthorId(), userId)) {
            throw new BusinessException("只能删除自己的内容");
        }
        // 2. 软删除：更新状态
        post.setStatus(CommunityPostStatusEnum.DELETED.getCode());
        post.setDeletedByUser(1);
        communityPostDao.updateById(post);
        log.info("删除内容: userId={}, postId={}", userId, postId);
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
    public Page<CommunityCommentVO> getComments(Long userId, Long postId, int page, int size) {
        requirePost(postId);
        LambdaQueryWrapper<CommunityComment> wrapper = new LambdaQueryWrapper<CommunityComment>()
                .eq(CommunityComment::getPostId, postId)
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
    public Long createComment(Long userId, CommunityCommentCreateReq req) {
        // 1. 校验交互权限
        ensureInteractionAllowed(userId);
        // 2. 校验内容存在且可评论
        CommunityPost post = requirePost(req.getPostId());
        if (!CommunityPostStatusEnum.PUBLISHED.getCode().equals(post.getStatus())) {
            throw new BusinessException("内容当前不可评论");
        }

        CommunityComment entity = new CommunityComment();
        entity.setPostId(req.getPostId());
        entity.setAuthorId(userId);
        entity.setParentCommentId(req.getParentCommentId());
        entity.setReplyUserId(req.getReplyUserId());
        entity.setContent(StrUtil.trim(req.getContent()));
        entity.setStatus(CommunityPostStatusEnum.PUBLISHED.getCode());
        entity.setAuditStatus(CommunityAuditStatusEnum.PENDING.getCode());
        entity.setReportCount(0);
        // 3. 写入评论
        communityCommentDao.insert(entity);

        // 4. 更新内容评论计数
        post.setCommentCount((post.getCommentCount() == null ? 0 : post.getCommentCount()) + 1);
        communityPostDao.updateById(post);
        log.info("发表评论: userId={}, postId={}, commentId={}", userId, req.getPostId(), entity.getId());
        return entity.getId();
    }

    /**
     * 删除自己的评论（软删除）
     *
     * @param userId    当前用户ID
     * @param commentId 评论ID
     */
    @Override
    @Transactional
    public void deleteComment(Long userId, Long commentId) {
        // 1. 校验评论存在且为本人所发
        CommunityComment comment = requireComment(commentId);
        if (!Objects.equals(comment.getAuthorId(), userId)) {
            throw new BusinessException("只能删除自己的评论");
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
        log.info("删除评论: userId={}, commentId={}", userId, commentId);
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
    public CommunityLikeToggleVO toggleLike(Long userId, Long postId) {
        // 1. 校验交互权限
        ensureInteractionAllowed(userId);
        // 2. 查询内容
        CommunityPost post = requirePost(postId);
        // 3. 查询已有点赞记录
        CommunityLike like = communityLikeDao.selectOne(new LambdaQueryWrapper<CommunityLike>()
                .eq(CommunityLike::getPostId, postId)
                .eq(CommunityLike::getUserId, userId));

        // 4. 三态切换逻辑
        boolean liked;
        int likeCount = post.getLikeCount() == null ? 0 : post.getLikeCount();
        if (like == null) {
            // 从未点赞 → 点赞
            like = new CommunityLike();
            like.setPostId(postId);
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
        log.info("点赞切换: userId={}, postId={}, liked={}", userId, postId, liked);
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
            throw new BusinessException("不能关注自己");
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
        log.info("关注切换: userId={}, targetUserId={}, following={}", userId, targetUserId, following);
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
    public Long createReport(Long userId, CommunityReportCreateReq req) {
        // 1. 校验举报目标类型
        if (CommunityReportTargetTypeEnum.getByCode(req.getTargetType()) == null) {
            throw new BusinessException("不支持的举报目标类型");
        }
        // 2. 校验举报原因合法
        requireReportReason(req.getReasonCode());
        // 3. 增加目标被举报计数
        increaseReportCount(req.getTargetType(), req.getTargetId());

        // 4. 创建举报记录
        CommunityReport report = new CommunityReport();
        report.setReporterId(userId);
        report.setTargetType(req.getTargetType());
        report.setTargetId(req.getTargetId());
        report.setReasonCode(req.getReasonCode());
        report.setExtraText(StrUtil.blankToDefault(StrUtil.trim(req.getExtraText()), null));
        report.setStatus(CommunityReportStatusEnum.PENDING.getCode());
        communityReportDao.insert(report);
        log.info("提交举报: userId={}, targetType={}, targetId={}, reportId={}",
                userId, req.getTargetType(), req.getTargetId(), report.getId());
        return report.getId();
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
        vo.setInteractionGateMode(configValue(configMap, CommunityConfigKeys.INTERACTION_GATE_MODE, CommunityGateModeEnum.LOGIN_ONLY.getCode()));
        vo.setPostMaxImages(configInt(configMap, CommunityConfigKeys.POST_MAX_IMAGES, 9));
        vo.setPostMaxTextLength(configInt(configMap, CommunityConfigKeys.POST_MAX_TEXT_LENGTH, 500));
        vo.setPostMaxMentions(configInt(configMap, CommunityConfigKeys.POST_MAX_MENTIONS, 5));
        vo.setSincerePostMinTextLength(configInt(configMap, CommunityConfigKeys.SINCERE_POST_MIN_TEXT_LENGTH, 20));
        vo.setContactInfoAllowed(configBool(configMap, CommunityConfigKeys.CONTACT_INFO_ALLOWED, false));
        vo.setReportEntryEnabled(configBool(configMap, CommunityConfigKeys.REPORT_ENTRY_ENABLED, true));
        vo.setHomeTabs(mobileEntryConfigDao.selectEnabledByPageCode(MobilePageCodeEnum.COMMUNITY_HOME_TAB.getCode())
                .stream().map(this::toMiniappEntry).toList());
        vo.setTopics(toTopicOptions(dictDataDao.selectByDictType("community_topic")));
        vo.setReportReasons(toDictOptions(dictDataDao.selectByDictType("community_report_reason")));
        return vo;
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
        List<SysDictData> topics = dictDataDao.selectByDictType("community_topic");
        if (topics == null) return List.of();
        return topics.stream()
                .filter(item -> item.getId() != null)
                .filter(item -> CommonStatusEnum.ENABLED.getCode().equals(item.getStatus()))
                .sorted(Comparator.comparing(item -> Optional.ofNullable(item.getDictSort()).orElse(Integer.MAX_VALUE)))
                .toList();
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
        result.setName(topic.getDictLabel());
        result.setDescription(topicDescription(topic));
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
        return StrUtil.blankToDefault(topic.getRemark(), "和有共同话题的人交换真实生活与想法");
    }

    /**
     * 校验用户交互权限（根据交互门槛模式判断是否允许交互）
     *
     * @param userId 用户ID
     */
    private void ensureInteractionAllowed(Long userId) {
        requireUser(userId);
        AppConfig config = appConfigDao.selectByKey(CommunityConfigKeys.INTERACTION_GATE_MODE);
        String mode = config != null ? config.getConfigValue() : CommunityGateModeEnum.LOGIN_ONLY.getCode();
        if (CommunityGateModeEnum.FULL_CERT.getCode().equals(mode)) {
            String accessStatus = accessEvaluator.evaluate(requireUser(userId)).getCoreAccessStatus();
            if (!"CORE_ALLOWED".equals(accessStatus)) {
                throw new BusinessException("完成三重认证后可进行社区互动");
            }
        }
    }

    /**
     * 校验内容发布请求参数（类型/图片数量/正文长度/@用户数量/诚意贴要求）
     *
     * @param req 内容发布请求
     */
    private void validatePostRequest(CommunityPostCreateReq req) {
        CommunityPostTypeEnum postType = CommunityPostTypeEnum.getByCode(req.getPostType());
        if (postType == null) {
            throw new BusinessException("不支持的内容类型");
        }
        requireTopic(req.getTopicId());

        int maxImages = defaultInt(CommunityConfigKeys.POST_MAX_IMAGES, 9);
        int maxTextLength = defaultInt(CommunityConfigKeys.POST_MAX_TEXT_LENGTH, 500);
        int maxMentions = defaultInt(CommunityConfigKeys.POST_MAX_MENTIONS, 5);
        int sincereMinLength = defaultInt(CommunityConfigKeys.SINCERE_POST_MIN_TEXT_LENGTH, 20);

        if (req.getImageUrls() != null && req.getImageUrls().size() > maxImages) {
            throw new BusinessException("图片数量不能超过 " + maxImages);
        }
        if (StrUtil.length(req.getContent()) > maxTextLength) {
            throw new BusinessException("正文长度不能超过 " + maxTextLength);
        }
        if (req.getMentionUserIds() != null && req.getMentionUserIds().size() > maxMentions) {
            throw new BusinessException("@用户数量不能超过 " + maxMentions);
        }
        if (CommunityPostTypeEnum.SINCERE_POST.equals(postType)) {
            if (StrUtil.isBlank(req.getTitle())) {
                throw new BusinessException("诚意贴标题不能为空");
            }
            if (StrUtil.length(StrUtil.trim(req.getContent())) < sincereMinLength) {
                throw new BusinessException("诚意贴正文长度不能少于 " + sincereMinLength);
            }
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
            throw new BusinessException("内容不存在");
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
            throw new BusinessException("评论不存在");
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
            throw new BusinessException("用户不存在");
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
        SysDictData topic = topicId == null ? null : dictDataDao.selectById(topicId);
        if (topic == null || !"community_topic".equals(topic.getDictType())
                || (topic.getStatus() != null && !CommonStatusEnum.ENABLED.getCode().equals(topic.getStatus()))) {
            throw new BusinessException("话题不存在");
        }
        return topic;
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
            throw new BusinessException("举报原因不存在");
        }
    }

    /**
     * 根据举报目标类型增加被举报计数（内容/评论）
     *
     * @param targetType 举报目标类型
     * @param targetId   目标ID
     */
    private void increaseReportCount(String targetType, Long targetId) {
        if (CommunityReportTargetTypeEnum.POST.getCode().equals(targetType)) {
            CommunityPost post = requirePost(targetId);
            post.setReportCount((post.getReportCount() == null ? 0 : post.getReportCount()) + 1);
            communityPostDao.updateById(post);
            return;
        }
        if (CommunityReportTargetTypeEnum.COMMENT.getCode().equals(targetType)) {
            CommunityComment comment = requireComment(targetId);
            comment.setReportCount((comment.getReportCount() == null ? 0 : comment.getReportCount()) + 1);
            communityCommentDao.updateById(comment);
            return;
        }
        requireUser(targetId);
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
        vo.setAuthorId(post.getAuthorId());
        vo.setAuthorName(author != null ? author.getNickname() : null);
        vo.setAuthorAvatar(auditContentService.publicAvatar(post.getAuthorId()));
        if (author != null) {
            vo.setAuthorGender(author.getGender());
            vo.setAuthorAge(author.getAge());
            vo.setAuthorCity(author.getLocationCity());
            vo.setAuthorZodiac(author.getZodiac());
            vo.setAuthorAnnualIncome(author.getAnnualIncome());
        }
        vo.setPostType(post.getPostType());
        vo.setTitle(post.getTitle());
        vo.setContent(post.getContent());
        vo.setImageUrls(parseJsonList(post.getImageUrls()));
        vo.setTopicId(post.getTopicId());
        vo.setTopicName(resolveTopicName(post.getTopicId()));
        vo.setLikeCount(defaultZero(post.getLikeCount()));
        vo.setCommentCount(defaultZero(post.getCommentCount()));
        vo.setReportCount(defaultZero(post.getReportCount()));
        vo.setLiked(userId != null && isLiked(userId, post.getId()));
        vo.setFollowingAuthor(userId != null && isFollowing(userId, post.getAuthorId()));
        vo.setStatus(post.getStatus());
        vo.setAuditStatus(post.getAuditStatus());
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
        vo.setAuthorId(post.getAuthorId());
        vo.setAuthorName(author != null ? author.getNickname() : null);
        vo.setAuthorAvatar(auditContentService.publicAvatar(post.getAuthorId()));
        vo.setPostType(post.getPostType());
        vo.setTitle(post.getTitle());
        vo.setContent(post.getContent());
        vo.setImageUrls(parseJsonList(post.getImageUrls()));
        vo.setTopicId(post.getTopicId());
        vo.setTopicName(resolveTopicName(post.getTopicId()));
        vo.setMentionUserIds(parseIdString(post.getMentionUserIds()));
        vo.setLikeCount(defaultZero(post.getLikeCount()));
        vo.setCommentCount(defaultZero(post.getCommentCount()));
        vo.setReportCount(defaultZero(post.getReportCount()));
        vo.setLiked(userId != null && isLiked(userId, post.getId()));
        vo.setFollowingAuthor(userId != null && isFollowing(userId, post.getAuthorId()));
        vo.setStatus(post.getStatus());
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
        result.setRecords(page.getRecords().stream().map(this::toCommentVO).toList());
        return result;
    }

    /**
     * 将评论实体转换为VO（含作者信息、被回复用户信息）
     *
     * @param comment 评论实体
     * @return 评论VO
     */
    private CommunityCommentVO toCommentVO(CommunityComment comment) {
        CommunityCommentVO vo = new CommunityCommentVO();
        AppUser author = appUserDao.selectById(comment.getAuthorId());
        AppUser replyUser = comment.getReplyUserId() != null ? appUserDao.selectById(comment.getReplyUserId()) : null;
        vo.setId(comment.getId());
        vo.setPostId(comment.getPostId());
        vo.setAuthorId(comment.getAuthorId());
        vo.setAuthorName(author != null ? author.getNickname() : null);
        vo.setAuthorAvatar(auditContentService.publicAvatar(comment.getAuthorId()));
        vo.setParentCommentId(comment.getParentCommentId());
        vo.setReplyUserId(comment.getReplyUserId());
        vo.setReplyUserName(replyUser != null ? replyUser.getNickname() : null);
        vo.setContent(comment.getContent());
        vo.setStatus(comment.getStatus());
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
        SysDictData topic = dictDataDao.selectById(topicId);
        return topic != null ? topic.getDictLabel() : null;
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

    /**
     * 从应用配置中读取整数值（单条查询），配置不存在或解析失败时返回默认值
     *
     * @param key          配置键
     * @param defaultValue 默认值
     * @return 配置中的整数值
     */
    private int defaultInt(String key, int defaultValue) {
        AppConfig config = appConfigDao.selectByKey(key);
        if (config == null || StrUtil.isBlank(config.getConfigValue())) {
            return defaultValue;
        }
        try {
            return Integer.parseInt(config.getConfigValue().trim());
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    /**
     * 从批量配置Map中读取字符串值，不存在时返回默认值
     *
     * @param configMap    配置Map
     * @param key          配置键
     * @param defaultValue 默认值
     * @return 配置值
     */
    private String configValue(Map<String, AppConfig> configMap, String key, String defaultValue) {
        AppConfig config = configMap.get(key);
        return config == null || StrUtil.isBlank(config.getConfigValue()) ? defaultValue : config.getConfigValue();
    }

    /**
     * 从批量配置Map中读取整数值，不存在或解析失败时返回默认值
     *
     * @param configMap    配置Map
     * @param key          配置键
     * @param defaultValue 默认值
     * @return 配置中的整数值
     */
    private int configInt(Map<String, AppConfig> configMap, String key, int defaultValue) {
        AppConfig config = configMap.get(key);
        if (config == null || StrUtil.isBlank(config.getConfigValue())) {
            return defaultValue;
        }
        try {
            return Integer.parseInt(config.getConfigValue().trim());
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    /**
     * 从批量配置Map中读取布尔值，不存在或为空时返回默认值
     *
     * @param configMap    配置Map
     * @param key          配置键
     * @param defaultValue 默认值
     * @return 配置中的布尔值
     */
    private boolean configBool(Map<String, AppConfig> configMap, String key, boolean defaultValue) {
        AppConfig config = configMap.get(key);
        if (config == null || StrUtil.isBlank(config.getConfigValue())) {
            return defaultValue;
        }
        return Boolean.parseBoolean(config.getConfigValue().trim());
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
