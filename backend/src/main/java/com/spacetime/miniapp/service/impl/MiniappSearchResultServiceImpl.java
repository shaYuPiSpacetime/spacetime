package com.spacetime.miniapp.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserRelationBlockDao;
import com.spacetime.common.dao.AppUserSearchLogDao;
import com.spacetime.common.dao.CommunityPostDao;
import com.spacetime.common.dao.DictDataDao;
import com.spacetime.common.dao.SearchBlockWordDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserRelationBlock;
import com.spacetime.common.entity.AppUserSearchLog;
import com.spacetime.common.entity.CommunityPost;
import com.spacetime.common.entity.SearchBlockWord;
import com.spacetime.common.entity.SysDictData;
import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.enums.CommunityAuditStatusEnum;
import com.spacetime.common.enums.CommunityPostStatusEnum;
import com.spacetime.common.enums.MatchTypeEnum;
import com.spacetime.common.enums.RelationBlockTypeEnum;
import com.spacetime.common.enums.SearchBlockTypeEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.AppUserAuditContentService;
import com.spacetime.miniapp.dto.response.MiniappSearchResultItemVO;
import com.spacetime.miniapp.dto.response.MiniappSearchResultPageVO;
import com.spacetime.miniapp.service.MiniappSearchResultService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 小程序入口限定搜索服务。
 */
@Service
@RequiredArgsConstructor
public class MiniappSearchResultServiceImpl implements MiniappSearchResultService {

    private static final String SCENE_GLOBAL = "global";
    private static final String SCENE_COMMUNITY = "community";
    private static final String SCENE_RECOMMEND = "recommend";
    private static final List<String> GLOBAL_TYPES = List.of("user", "post", "topic");
    private static final List<String> COMMUNITY_TYPES = List.of("post", "topic");
    private static final List<String> RECOMMEND_TYPES = List.of("user");

    private final SearchBlockWordDao searchBlockWordDao;
    private final AppUserSearchLogDao searchLogDao;
    private final AppUserRelationBlockDao relationBlockDao;
    private final AppUserDao appUserDao;
    private final CommunityPostDao communityPostDao;
    private final DictDataDao dictDataDao;
    private final AppUserAuditContentService auditContentService;

    @Override
    public MiniappSearchResultPageVO search(Long userId,
                                            String keyword,
                                            String type,
                                            String sourceScene,
                                            int page,
                                            int size) {
        String normalizedKeyword = normalizeKeyword(keyword);
        String normalizedScene = normalizeScene(sourceScene);
        List<String> allowedTypes = allowedTypes(normalizedScene);
        String normalizedType = StringUtils.hasText(type) ? type.trim().toLowerCase(Locale.ROOT) : "all";
        validateType(normalizedType, normalizedScene, allowedTypes);

        List<SearchBlockWord> enabledWords = searchBlockWordDao.selectEnabledList();
        SearchBlockWord violation = firstMatched(
                normalizedKeyword, enabledWords, SearchBlockTypeEnum.SEARCH_VIOLATION.getCode());
        if (violation != null) {
            writeLog(userId, normalizedKeyword, normalizedType, normalizedScene, 0, true);
            return buildViolation(normalizedKeyword, normalizedType, normalizedScene, allowedTypes, violation);
        }

        int safePage = Math.max(page, 1);
        int safeSize = Math.min(Math.max(size, 1), 100);
        List<SearchBlockWord> resultBlocks = wordsOfType(enabledWords, SearchBlockTypeEnum.RESULT_BLOCK.getCode());
        SearchSlice slice = "all".equals(normalizedType)
                ? searchAll(userId, normalizedKeyword, allowedTypes, safePage, safeSize, resultBlocks)
                : searchOne(userId, normalizedKeyword, normalizedType, safePage, safeSize, resultBlocks);

        MiniappSearchResultPageVO result = baseResult(
                normalizedKeyword, normalizedType, normalizedScene, allowedTypes);
        result.setItems(slice.items());
        result.setTotalCount(slice.total());
        result.setHasMore(slice.hasMore());
        result.setViolation(false);
        result.setMessage(slice.items().isEmpty() ? "暂无相关内容" : null);
        writeLog(userId, normalizedKeyword, normalizedType, normalizedScene, slice.items().size(), false);
        return result;
    }

    private SearchSlice searchAll(Long userId,
                                  String keyword,
                                  List<String> allowedTypes,
                                  int page,
                                  int size,
                                  List<SearchBlockWord> resultBlocks) {
        int fetchSize = Math.min(page * size, 100);
        List<MiniappSearchResultItemVO> merged = new ArrayList<>();
        long total = 0L;
        for (String allowedType : allowedTypes) {
            SearchSlice part = searchOne(userId, keyword, allowedType, 1, fetchSize, resultBlocks);
            merged.addAll(part.items());
            total += part.total();
        }
        int from = Math.min((page - 1) * size, merged.size());
        int to = Math.min(from + size, merged.size());
        List<MiniappSearchResultItemVO> items = merged.subList(from, to);
        return new SearchSlice(items, total, total > (long) page * size);
    }

    private SearchSlice searchOne(Long userId,
                                  String keyword,
                                  String type,
                                  int page,
                                  int size,
                                  List<SearchBlockWord> resultBlocks) {
        return switch (type) {
            case "user" -> searchUsers(userId, keyword, page, size, resultBlocks);
            case "post" -> searchPosts(userId, keyword, page, size, resultBlocks);
            case "topic" -> searchTopics(keyword, page, size, resultBlocks);
            default -> throw new BusinessException("不支持的搜索类型");
        };
    }

    private SearchSlice searchUsers(Long userId,
                                    String keyword,
                                    int page,
                                    int size,
                                    List<SearchBlockWord> resultBlocks) {
        Long userCode = parseUserCode(keyword);
        LambdaQueryWrapper<AppUser> wrapper = new LambdaQueryWrapper<AppUser>()
                .eq(AppUser::getAccountStatus, AccountStatusEnum.NORMAL.getCode())
                .and(query -> {
                    query.like(AppUser::getNickname, keyword)
                            .or().like(AppUser::getLocationCity, keyword);
                    if (userCode != null) {
                        query.or().eq(AppUser::getId, userCode);
                    }
                })
                .orderByDesc(AppUser::getUpdateTime)
                .orderByDesc(AppUser::getId);
        Page<AppUser> result = appUserDao.selectPage(new Page<>(page, size), wrapper);
        Set<Long> blacklisted = blacklistedUserIds(userId);
        List<AppUser> visibleUsers = result.getRecords().stream()
                .filter(user -> !blacklisted.contains(user.getId()))
                .filter(user -> !matchesAny(userSearchText(user), resultBlocks))
                .toList();
        Map<Long, String> avatars = publicAvatars(visibleUsers.stream().map(AppUser::getId).toList());
        List<MiniappSearchResultItemVO> items = visibleUsers.stream()
                .map(user -> toUserItem(user, avatars.get(user.getId())))
                .toList();
        return filteredSlice(result, items);
    }

    private SearchSlice searchPosts(Long userId,
                                    String keyword,
                                    int page,
                                    int size,
                                    List<SearchBlockWord> resultBlocks) {
        LambdaQueryWrapper<CommunityPost> wrapper = new LambdaQueryWrapper<CommunityPost>()
                .eq(CommunityPost::getStatus, CommunityPostStatusEnum.PUBLISHED.getCode())
                .eq(CommunityPost::getAuditStatus, CommunityAuditStatusEnum.APPROVED.getCode())
                .and(query -> query.isNull(CommunityPost::getDeletedByUser)
                        .or().eq(CommunityPost::getDeletedByUser, 0))
                .and(query -> query.like(CommunityPost::getTitle, keyword)
                        .or().like(CommunityPost::getContent, keyword))
                .orderByDesc(CommunityPost::getCreateTime)
                .orderByDesc(CommunityPost::getId);
        Page<CommunityPost> result = communityPostDao.selectPage(new Page<>(page, size), wrapper);
        Set<Long> blacklisted = blacklistedUserIds(userId);
        List<CommunityPost> visiblePosts = result.getRecords().stream()
                .filter(post -> post.getAuthorId() == null || !blacklisted.contains(post.getAuthorId()))
                .filter(post -> !matchesAny(postSearchText(post), resultBlocks))
                .toList();
        Map<Long, String> avatars = publicAvatars(
                visiblePosts.stream().map(CommunityPost::getAuthorId).filter(java.util.Objects::nonNull).toList());
        List<MiniappSearchResultItemVO> items = visiblePosts.stream()
                .map(post -> toPostItem(post, avatars.get(post.getAuthorId())))
                .toList();
        return filteredSlice(result, items);
    }

    private SearchSlice searchTopics(String keyword,
                                     int page,
                                     int size,
                                     List<SearchBlockWord> resultBlocks) {
        List<SysDictData> topics = dictDataDao.selectList(
                new LambdaQueryWrapper<SysDictData>()
                        .eq(SysDictData::getDictType, "community_topic")
                        .eq(SysDictData::getStatus, CommonStatusEnum.ENABLED.getCode())
                        .and(query -> query.like(SysDictData::getDictLabel, keyword)
                                .or().like(SysDictData::getRemark, keyword))
                        .orderByAsc(SysDictData::getDictSort)
                        .orderByAsc(SysDictData::getId));
        List<SysDictData> visibleTopics = topics.stream()
                .filter(topic -> !matchesAny(topicSearchText(topic), resultBlocks))
                .toList();
        int from = Math.min((page - 1) * size, visibleTopics.size());
        int to = Math.min(from + size, visibleTopics.size());
        List<MiniappSearchResultItemVO> items = visibleTopics.subList(from, to).stream()
                .map(this::toTopicItem)
                .toList();
        return new SearchSlice(items, visibleTopics.size(), visibleTopics.size() > (long) page * size);
    }

    private SearchSlice filteredSlice(Page<?> raw, List<MiniappSearchResultItemVO> items) {
        long total = raw.getRecords().size() == items.size() ? raw.getTotal() : items.size();
        return new SearchSlice(items, total, raw.getTotal() > raw.getCurrent() * raw.getSize());
    }

    private Set<Long> blacklistedUserIds(Long userId) {
        if (userId == null) {
            return Set.of();
        }
        List<AppUserRelationBlock> relations = relationBlockDao.selectActiveByUserId(
                userId, RelationBlockTypeEnum.BLACKLIST.getCode());
        if (relations == null || relations.isEmpty()) {
            return Set.of();
        }
        return relations.stream()
                .map(AppUserRelationBlock::getTargetUserId)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());
    }

    private Map<Long, String> publicAvatars(List<Long> userIds) {
        if (userIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, String> avatars = auditContentService.publicAvatars(userIds);
        return avatars == null ? Map.of() : avatars;
    }

    private MiniappSearchResultItemVO toUserItem(AppUser user, String avatar) {
        MiniappSearchResultItemVO item = new MiniappSearchResultItemVO();
        item.setId(user.getId());
        item.setType("user");
        item.setTitle(displayName(user));
        item.setSubtitle(joinSubtitle(user.getLocationCity(), "成家号 " + user.getId()));
        item.setAvatar(avatar);
        return item;
    }

    private MiniappSearchResultItemVO toPostItem(CommunityPost post, String avatar) {
        MiniappSearchResultItemVO item = new MiniappSearchResultItemVO();
        item.setId(post.getId());
        item.setType("post");
        item.setTitle(firstNonBlank(post.getTitle(), abbreviate(post.getContent(), 30)));
        item.setSubtitle(abbreviate(post.getContent(), 50));
        item.setAvatar(avatar);
        return item;
    }

    private MiniappSearchResultItemVO toTopicItem(SysDictData topic) {
        MiniappSearchResultItemVO item = new MiniappSearchResultItemVO();
        item.setId(topic.getId());
        item.setType("topic");
        item.setTitle(topic.getDictLabel());
        item.setSubtitle(topic.getRemark());
        return item;
    }

    private MiniappSearchResultPageVO buildViolation(String keyword,
                                                       String type,
                                                       String sourceScene,
                                                       List<String> tabs,
                                                       SearchBlockWord word) {
        MiniappSearchResultPageVO result = baseResult(keyword, type, sourceScene, tabs);
        result.setItems(List.of());
        result.setHasMore(false);
        result.setTotalCount(0L);
        result.setViolation(true);
        result.setMessage(StringUtils.hasText(word.getHitMessage())
                ? word.getHitMessage()
                : "搜索内容不支持展示");
        return result;
    }

    private MiniappSearchResultPageVO baseResult(String keyword,
                                                  String type,
                                                  String sourceScene,
                                                  List<String> tabs) {
        MiniappSearchResultPageVO result = new MiniappSearchResultPageVO();
        result.setKeyword(keyword);
        result.setType(type);
        result.setSourceScene(sourceScene);
        result.setTabs(tabs);
        return result;
    }

    private String normalizeKeyword(String keyword) {
        if (!StringUtils.hasText(keyword)) {
            throw new BusinessException("搜索关键词不能为空");
        }
        String value = keyword.trim();
        if (value.length() > 30) {
            throw new BusinessException("搜索关键词不能超过30个字符");
        }
        return value;
    }

    private String normalizeScene(String sourceScene) {
        if (!StringUtils.hasText(sourceScene)) {
            return SCENE_GLOBAL;
        }
        String scene = sourceScene.trim().toLowerCase(Locale.ROOT);
        return switch (scene) {
            case SCENE_GLOBAL, SCENE_COMMUNITY, SCENE_RECOMMEND -> scene;
            default -> SCENE_GLOBAL;
        };
    }

    private List<String> allowedTypes(String sourceScene) {
        return switch (sourceScene) {
            case SCENE_COMMUNITY -> COMMUNITY_TYPES;
            case SCENE_RECOMMEND -> RECOMMEND_TYPES;
            default -> GLOBAL_TYPES;
        };
    }

    private void validateType(String type, String sourceScene, Collection<String> allowedTypes) {
        if (!"all".equals(type) && !allowedTypes.contains(type)) {
            throw new BusinessException("当前来源场景不支持该搜索类型: " + sourceScene + "/" + type);
        }
    }

    private SearchBlockWord firstMatched(String keyword, List<SearchBlockWord> words, String blockType) {
        return wordsOfType(words, blockType).stream()
                .filter(word -> matches(keyword, word))
                .findFirst()
                .orElse(null);
    }

    private List<SearchBlockWord> wordsOfType(List<SearchBlockWord> words, String blockType) {
        if (words == null || words.isEmpty()) {
            return List.of();
        }
        return words.stream().filter(word -> blockType.equals(word.getBlockType())).toList();
    }

    private boolean matchesAny(String value, List<SearchBlockWord> words) {
        return words.stream().anyMatch(word -> matches(value, word));
    }

    private boolean matches(String value, SearchBlockWord word) {
        if (!StringUtils.hasText(value) || !StringUtils.hasText(word.getWord())) {
            return false;
        }
        String target = value.toLowerCase(Locale.ROOT);
        String pattern = word.getWord().trim().toLowerCase(Locale.ROOT);
        if (MatchTypeEnum.EXACT.getCode().equals(word.getMatchType())) {
            return target.equals(pattern);
        }
        if (MatchTypeEnum.FUZZY.getCode().equals(word.getMatchType())) {
            return target.contains(pattern);
        }
        return false;
    }

    private String userSearchText(AppUser user) {
        return displayName(user) + " " + safe(user.getLocationCity()) + " " + user.getId();
    }

    private String postSearchText(CommunityPost post) {
        return safe(post.getTitle()) + " " + safe(post.getContent());
    }

    private String topicSearchText(SysDictData topic) {
        return safe(topic.getDictLabel()) + " " + safe(topic.getRemark());
    }

    private String displayName(AppUser user) {
        return StringUtils.hasText(user.getNickname()) ? user.getNickname() : "成家号 " + user.getId();
    }

    private String joinSubtitle(String... values) {
        return java.util.Arrays.stream(values)
                .filter(StringUtils::hasText)
                .collect(Collectors.joining(" · "));
    }

    private String firstNonBlank(String first, String second) {
        return StringUtils.hasText(first) ? first : second;
    }

    private String abbreviate(String value, int maxLength) {
        if (!StringUtils.hasText(value)) {
            return "";
        }
        String text = value.trim();
        return text.length() <= maxLength ? text : text.substring(0, maxLength) + "…";
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }

    private Long parseUserCode(String keyword) {
        String value = keyword.trim().toUpperCase(Locale.ROOT);
        if (value.startsWith("U")) {
            value = value.substring(1);
        }
        try {
            return value.matches("\\d+") ? Long.valueOf(value) : null;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private void writeLog(Long userId,
                          String keyword,
                          String type,
                          String sourceScene,
                          int count,
                          boolean violation) {
        AppUserSearchLog log = new AppUserSearchLog();
        log.setUserId(userId);
        log.setKeyword(keyword);
        log.setSearchType(type);
        log.setSourceScene(sourceScene);
        log.setResultCount(count);
        log.setViolation(violation ? 1 : 0);
        searchLogDao.insert(log);
    }

    private record SearchSlice(List<MiniappSearchResultItemVO> items, long total, boolean hasMore) {
    }
}
