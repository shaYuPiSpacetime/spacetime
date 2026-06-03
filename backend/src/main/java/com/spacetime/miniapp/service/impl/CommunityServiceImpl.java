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
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 小程序社区服务实现
 */
@Service
@RequiredArgsConstructor
public class CommunityServiceImpl implements CommunityService {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final CommunityPostDao communityPostDao;
    private final CommunityCommentDao communityCommentDao;
    private final CommunityLikeDao communityLikeDao;
    private final CommunityFollowDao communityFollowDao;
    private final CommunityReportDao communityReportDao;
    private final AppConfigDao appConfigDao;
    private final MobileEntryConfigDao mobileEntryConfigDao;
    private final DictDataDao dictDataDao;
    private final UserDao userDao;

    @Override
    public Page<CommunityPostCardVO> getPosts(Long userId, String postType, Long topicId, int page, int size) {
        LambdaQueryWrapper<CommunityPost> wrapper = new LambdaQueryWrapper<CommunityPost>()
                .eq(StrUtil.isNotBlank(postType), CommunityPost::getPostType, postType)
                .eq(topicId != null, CommunityPost::getTopicId, topicId)
                .eq(CommunityPost::getStatus, CommunityPostStatusEnum.PUBLISHED.getCode())
                .orderByDesc(CommunityPost::getCreateTime);
        Page<CommunityPost> result = communityPostDao.selectPage(new Page<>(page, Math.min(size, 100)), wrapper);
        return toPostCardPage(userId, result);
    }

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

    @Override
    @Transactional
    public Long createPost(Long userId, CommunityPostCreateReq req) {
        ensureInteractionAllowed(userId);
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
        communityPostDao.insert(entity);
        return entity.getId();
    }

    @Override
    @Transactional
    public void deletePost(Long userId, Long postId) {
        CommunityPost post = requirePost(postId);
        if (!Objects.equals(post.getAuthorId(), userId)) {
            throw new BusinessException("只能删除自己的内容");
        }
        post.setStatus(CommunityPostStatusEnum.DELETED.getCode());
        post.setDeletedByUser(1);
        communityPostDao.updateById(post);
    }

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

    @Override
    @Transactional
    public Long createComment(Long userId, CommunityCommentCreateReq req) {
        ensureInteractionAllowed(userId);
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
        communityCommentDao.insert(entity);

        post.setCommentCount((post.getCommentCount() == null ? 0 : post.getCommentCount()) + 1);
        communityPostDao.updateById(post);
        return entity.getId();
    }

    @Override
    @Transactional
    public void deleteComment(Long userId, Long commentId) {
        CommunityComment comment = requireComment(commentId);
        if (!Objects.equals(comment.getAuthorId(), userId)) {
            throw new BusinessException("只能删除自己的评论");
        }
        if (CommunityPostStatusEnum.DELETED.getCode().equals(comment.getStatus())) {
            return;
        }
        comment.setStatus(CommunityPostStatusEnum.DELETED.getCode());
        communityCommentDao.updateById(comment);

        CommunityPost post = requirePost(comment.getPostId());
        int count = post.getCommentCount() == null ? 0 : post.getCommentCount();
        post.setCommentCount(Math.max(0, count - 1));
        communityPostDao.updateById(post);
    }

    @Override
    @Transactional
    public CommunityLikeToggleVO toggleLike(Long userId, Long postId) {
        ensureInteractionAllowed(userId);
        CommunityPost post = requirePost(postId);
        CommunityLike like = communityLikeDao.selectOne(new LambdaQueryWrapper<CommunityLike>()
                .eq(CommunityLike::getPostId, postId)
                .eq(CommunityLike::getUserId, userId));

        boolean liked;
        int likeCount = post.getLikeCount() == null ? 0 : post.getLikeCount();
        if (like == null) {
            like = new CommunityLike();
            like.setPostId(postId);
            like.setUserId(userId);
            like.setStatus(CommonStatusEnum.ENABLED.getCode());
            communityLikeDao.insert(like);
            liked = true;
            likeCount += 1;
        } else if (CommonStatusEnum.ENABLED.getCode().equals(like.getStatus())) {
            like.setStatus(CommonStatusEnum.DISABLED.getCode());
            communityLikeDao.updateById(like);
            liked = false;
            likeCount = Math.max(0, likeCount - 1);
        } else {
            like.setStatus(CommonStatusEnum.ENABLED.getCode());
            communityLikeDao.updateById(like);
            liked = true;
            likeCount += 1;
        }
        post.setLikeCount(likeCount);
        communityPostDao.updateById(post);

        CommunityLikeToggleVO vo = new CommunityLikeToggleVO();
        vo.setLiked(liked);
        vo.setLikeCount(likeCount);
        return vo;
    }

    @Override
    @Transactional
    public CommunityFollowToggleVO toggleFollow(Long userId, Long targetUserId) {
        ensureInteractionAllowed(userId);
        if (Objects.equals(userId, targetUserId)) {
            throw new BusinessException("不能关注自己");
        }
        requireUser(targetUserId);

        CommunityFollow follow = communityFollowDao.selectOne(new LambdaQueryWrapper<CommunityFollow>()
                .eq(CommunityFollow::getFollowerId, userId)
                .eq(CommunityFollow::getTargetUserId, targetUserId));

        boolean following;
        if (follow == null) {
            follow = new CommunityFollow();
            follow.setFollowerId(userId);
            follow.setTargetUserId(targetUserId);
            follow.setStatus(CommunityFollowStatusEnum.FOLLOW.getCode());
            communityFollowDao.insert(follow);
            following = true;
        } else if (CommunityFollowStatusEnum.FOLLOW.getCode().equals(follow.getStatus())) {
            follow.setStatus(CommunityFollowStatusEnum.UNFOLLOW.getCode());
            communityFollowDao.updateById(follow);
            following = false;
        } else {
            follow.setStatus(CommunityFollowStatusEnum.FOLLOW.getCode());
            communityFollowDao.updateById(follow);
            following = true;
        }

        CommunityFollowToggleVO vo = new CommunityFollowToggleVO();
        vo.setFollowing(following);
        return vo;
    }

    @Override
    @Transactional
    public Long createReport(Long userId, CommunityReportCreateReq req) {
        if (CommunityReportTargetTypeEnum.getByCode(req.getTargetType()) == null) {
            throw new BusinessException("不支持的举报目标类型");
        }
        requireReportReason(req.getReasonCode());
        increaseReportCount(req.getTargetType(), req.getTargetId());

        CommunityReport report = new CommunityReport();
        report.setReporterId(userId);
        report.setTargetType(req.getTargetType());
        report.setTargetId(req.getTargetId());
        report.setReasonCode(req.getReasonCode());
        report.setExtraText(StrUtil.blankToDefault(StrUtil.trim(req.getExtraText()), null));
        report.setStatus(CommunityReportStatusEnum.PENDING.getCode());
        communityReportDao.insert(report);
        return report.getId();
    }

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
        return vo;
    }

    private void ensureInteractionAllowed(Long userId) {
        requireUser(userId);
        AppConfig config = appConfigDao.selectByKey(CommunityConfigKeys.INTERACTION_GATE_MODE);
        String mode = config != null ? config.getConfigValue() : CommunityGateModeEnum.LOGIN_ONLY.getCode();
        if (CommunityGateModeEnum.FULL_CERT.getCode().equals(mode)) {
            throw new BusinessException("当前环境尚未接入三项认证状态，请先切换为仅登录准入");
        }
    }

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

    private CommunityPost requirePost(Long id) {
        CommunityPost post = communityPostDao.selectById(id);
        if (post == null) {
            throw new BusinessException("内容不存在");
        }
        return post;
    }

    private CommunityComment requireComment(Long id) {
        CommunityComment comment = communityCommentDao.selectById(id);
        if (comment == null) {
            throw new BusinessException("评论不存在");
        }
        return comment;
    }

    private SysUser requireUser(Long userId) {
        SysUser user = userDao.selectById(userId);
        if (user == null) {
            throw new BusinessException("用户不存在");
        }
        return user;
    }

    private void requireTopic(Long topicId) {
        SysDictData topic = dictDataDao.selectById(topicId);
        if (topic == null || !"community_topic".equals(topic.getDictType())) {
            throw new BusinessException("话题不存在");
        }
    }

    private void requireReportReason(String reasonCode) {
        List<SysDictData> items = dictDataDao.selectByDictType("community_report_reason");
        boolean exists = items.stream().anyMatch(item -> reasonCode.equals(item.getDictValue()));
        if (!exists) {
            throw new BusinessException("举报原因不存在");
        }
    }

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

    private Page<CommunityPostCardVO> toPostCardPage(Long userId, Page<CommunityPost> page) {
        Page<CommunityPostCardVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(page.getRecords().stream().map(post -> toPostCard(userId, post)).toList());
        return result;
    }

    private CommunityPostCardVO toPostCard(Long userId, CommunityPost post) {
        CommunityPostCardVO vo = new CommunityPostCardVO();
        SysUser author = userDao.selectById(post.getAuthorId());
        vo.setId(post.getId());
        vo.setAuthorId(post.getAuthorId());
        vo.setAuthorName(author != null ? author.getNickname() : null);
        vo.setAuthorAvatar(author != null ? author.getAvatar() : null);
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

    private void fillPostDetail(CommunityPostDetailVO vo, Long userId, CommunityPost post) {
        SysUser author = userDao.selectById(post.getAuthorId());
        vo.setId(post.getId());
        vo.setAuthorId(post.getAuthorId());
        vo.setAuthorName(author != null ? author.getNickname() : null);
        vo.setAuthorAvatar(author != null ? author.getAvatar() : null);
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

    private Page<CommunityCommentVO> toCommentPage(Long userId, Page<CommunityComment> page) {
        Page<CommunityCommentVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(page.getRecords().stream().map(this::toCommentVO).toList());
        return result;
    }

    private CommunityCommentVO toCommentVO(CommunityComment comment) {
        CommunityCommentVO vo = new CommunityCommentVO();
        SysUser author = userDao.selectById(comment.getAuthorId());
        SysUser replyUser = comment.getReplyUserId() != null ? userDao.selectById(comment.getReplyUserId()) : null;
        vo.setId(comment.getId());
        vo.setPostId(comment.getPostId());
        vo.setAuthorId(comment.getAuthorId());
        vo.setAuthorName(author != null ? author.getNickname() : null);
        vo.setAuthorAvatar(author != null ? author.getAvatar() : null);
        vo.setParentCommentId(comment.getParentCommentId());
        vo.setReplyUserId(comment.getReplyUserId());
        vo.setReplyUserName(replyUser != null ? replyUser.getNickname() : null);
        vo.setContent(comment.getContent());
        vo.setStatus(comment.getStatus());
        vo.setAuditStatus(comment.getAuditStatus());
        vo.setCreateTime(comment.getCreateTime() != null ? comment.getCreateTime().format(FMT) : null);
        return vo;
    }

    private boolean isLiked(Long userId, Long postId) {
        CommunityLike like = communityLikeDao.selectOne(new LambdaQueryWrapper<CommunityLike>()
                .eq(CommunityLike::getUserId, userId)
                .eq(CommunityLike::getPostId, postId));
        return like != null && CommonStatusEnum.ENABLED.getCode().equals(like.getStatus());
    }

    private boolean isFollowing(Long userId, Long targetUserId) {
        if (Objects.equals(userId, targetUserId)) {
            return false;
        }
        CommunityFollow follow = communityFollowDao.selectOne(new LambdaQueryWrapper<CommunityFollow>()
                .eq(CommunityFollow::getFollowerId, userId)
                .eq(CommunityFollow::getTargetUserId, targetUserId));
        return follow != null && CommunityFollowStatusEnum.FOLLOW.getCode().equals(follow.getStatus());
    }

    private String resolveTopicName(Long topicId) {
        if (topicId == null) {
            return null;
        }
        SysDictData topic = dictDataDao.selectById(topicId);
        return topic != null ? topic.getDictLabel() : null;
    }

    private String toJsonList(List<String> values) {
        if (values == null || values.isEmpty()) {
            return "[]";
        }
        return values.stream().filter(StrUtil::isNotBlank).map(String::trim)
                .collect(Collectors.joining("\",\"", "[\"", "\"]"))
                .replace("[\"\"]", "[]");
    }

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

    private String toIdString(List<Long> ids) {
        return ids == null || ids.isEmpty()
                ? null
                : ids.stream().filter(Objects::nonNull).map(String::valueOf).collect(Collectors.joining(","));
    }

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

    private int defaultZero(Integer value) {
        return value == null ? 0 : value;
    }

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

    private String configValue(Map<String, AppConfig> configMap, String key, String defaultValue) {
        AppConfig config = configMap.get(key);
        return config == null || StrUtil.isBlank(config.getConfigValue()) ? defaultValue : config.getConfigValue();
    }

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

    private boolean configBool(Map<String, AppConfig> configMap, String key, boolean defaultValue) {
        AppConfig config = configMap.get(key);
        if (config == null || StrUtil.isBlank(config.getConfigValue())) {
            return defaultValue;
        }
        return Boolean.parseBoolean(config.getConfigValue().trim());
    }

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
