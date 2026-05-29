package com.spacetime.miniapp.service.impl;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.AppUserRelationBlockDao;
import com.spacetime.common.dao.AppUserSearchLogDao;
import com.spacetime.common.dao.SearchBlockWordDao;
import com.spacetime.common.dao.UserDao;
import com.spacetime.common.entity.AppUserRelationBlock;
import com.spacetime.common.entity.AppUserSearchLog;
import com.spacetime.common.entity.SearchBlockWord;
import com.spacetime.common.entity.SysUser;
import com.spacetime.common.enums.MatchTypeEnum;
import com.spacetime.common.enums.RelationBlockTypeEnum;
import com.spacetime.common.enums.SearchBlockTypeEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.miniapp.dto.response.MiniappSearchResultItemVO;
import com.spacetime.miniapp.dto.response.MiniappSearchResultPageVO;
import com.spacetime.miniapp.service.MiniappSearchResultService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MiniappSearchResultServiceImpl implements MiniappSearchResultService {
    private final SearchBlockWordDao searchBlockWordDao;
    private final AppUserSearchLogDao searchLogDao;
    private final AppUserRelationBlockDao relationBlockDao;
    private final UserDao userDao;

    @Override
    public MiniappSearchResultPageVO search(Long userId, String keyword, String type, int page, int size) {
        String normalized = normalizeKeyword(keyword);
        String searchType = StringUtils.hasText(type) ? type : "all";
        SearchBlockWord violation = firstMatched(normalized, SearchBlockTypeEnum.SEARCH_VIOLATION.getCode());
        if (violation != null) {
            writeLog(userId, normalized, searchType, 0, true);
            return buildViolation(normalized, searchType, violation);
        }

        MiniappSearchResultPageVO vo = new MiniappSearchResultPageVO();
        vo.setKeyword(normalized);
        vo.setType(searchType);
        vo.setTabs(List.of("all", "user", "post", "topic"));
        vo.setViolation(false);
        vo.setMessage(null);

        if ("all".equals(searchType) || "user".equals(searchType)) {
            Page<SysUser> result = userDao.search(new Page<>(Math.max(page, 1), Math.max(size, 1)), normalized);
            Set<Long> blacklisted = relationBlockDao.selectActiveByUserId(userId, RelationBlockTypeEnum.BLACKLIST.getCode())
                    .stream()
                    .map(AppUserRelationBlock::getTargetUserId)
                    .collect(Collectors.toSet());
            List<SearchBlockWord> resultBlocks = enabledWords(SearchBlockTypeEnum.RESULT_BLOCK.getCode());
            List<MiniappSearchResultItemVO> items = result.getRecords().stream()
                    .filter(u -> !blacklisted.contains(u.getId()))
                    .filter(u -> !matchesAny(displayText(u), resultBlocks))
                    .map(this::toItem)
                    .toList();
            vo.setItems(items);
            // 注意：totalCount 为内存过滤后的当前页数量，非精确总数
            // 因黑名单和 RESULT_BLOCK 过滤在内存执行，精确 total 需后续改为 SQL 层排除
            vo.setTotalCount((long) items.size());
            vo.setHasMore(result.getTotal() > result.getCurrent() * result.getSize());
        } else if ("post".equals(searchType) || "topic".equals(searchType)) {
            vo.setItems(List.of());
            vo.setTotalCount(0L);
            vo.setHasMore(false);
            vo.setMessage("暂无相关内容");
        } else {
            throw new BusinessException("不支持的搜索类型");
        }
        writeLog(userId, normalized, searchType, vo.getTotalCount().intValue(), false);
        return vo;
    }

    private MiniappSearchResultPageVO buildViolation(String keyword, String type, SearchBlockWord word) {
        MiniappSearchResultPageVO vo = new MiniappSearchResultPageVO();
        vo.setKeyword(keyword);
        vo.setType(type);
        vo.setTabs(List.of("all", "user", "post", "topic"));
        vo.setItems(List.of());
        vo.setHasMore(false);
        vo.setTotalCount(0L);
        vo.setViolation(true);
        vo.setMessage(StringUtils.hasText(word.getHitMessage()) ? word.getHitMessage() : "搜索词包含违规内容");
        return vo;
    }

    private MiniappSearchResultItemVO toItem(SysUser user) {
        MiniappSearchResultItemVO item = new MiniappSearchResultItemVO();
        item.setId(user.getId());
        item.setType("user");
        item.setTitle(displayText(user));
        item.setSubtitle(user.getUsername());
        item.setAvatar(user.getAvatar());
        return item;
    }

    private String normalizeKeyword(String keyword) {
        if (!StringUtils.hasText(keyword)) {
            throw new BusinessException("搜索关键词不能为空");
        }
        String value = keyword.trim();
        return value.length() > 100 ? value.substring(0, 100) : value;
    }

    private SearchBlockWord firstMatched(String keyword, String blockType) {
        return enabledWords(blockType).stream().filter(word -> matches(keyword, word)).findFirst().orElse(null);
    }

    private boolean matchesAny(String value, List<SearchBlockWord> words) {
        return words.stream().anyMatch(word -> matches(value, word));
    }

    private boolean matches(String value, SearchBlockWord word) {
        if (!StringUtils.hasText(value) || !StringUtils.hasText(word.getWord())) {
            return false;
        }
        String target = value.toLowerCase();
        String pattern = word.getWord().toLowerCase();
        if (MatchTypeEnum.EXACT.getCode().equals(word.getMatchType())) {
            return target.equals(pattern);
        }
        if (MatchTypeEnum.PREFIX.getCode().equals(word.getMatchType())) {
            return target.startsWith(pattern);
        }
        return target.contains(pattern);
    }

    private List<SearchBlockWord> enabledWords(String blockType) {
        return searchBlockWordDao.selectEnabledList().stream()
                .filter(word -> blockType.equals(word.getBlockType()))
                .toList();
    }

    private String displayText(SysUser user) {
        return StringUtils.hasText(user.getNickname()) ? user.getNickname() : user.getUsername();
    }

    private void writeLog(Long userId, String keyword, String type, int count, boolean violation) {
        AppUserSearchLog log = new AppUserSearchLog();
        log.setUserId(userId);
        log.setKeyword(keyword);
        log.setSearchType(type);
        log.setResultCount(count);
        log.setViolation(violation ? 1 : 0);
        searchLogDao.insert(log);
    }
}
