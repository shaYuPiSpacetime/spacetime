package com.spacetime.miniapp.service.impl;

import cn.hutool.core.util.StrUtil;
import com.spacetime.common.dao.AppConfigDao;
import com.spacetime.common.dao.MobileEntryConfigDao;
import com.spacetime.common.dao.SearchBlockWordDao;
import com.spacetime.common.dao.SearchHotWordDao;
import com.spacetime.common.entity.AppConfig;
import com.spacetime.common.entity.MobileEntryConfig;
import com.spacetime.common.entity.SearchBlockWord;
import com.spacetime.common.entity.SearchHotWord;
import com.spacetime.common.enums.MatchTypeEnum;
import com.spacetime.common.enums.SearchBlockTypeEnum;
import com.spacetime.miniapp.dto.response.MiniappEntryConfigVO;
import com.spacetime.miniapp.dto.response.MiniappHotWordVO;
import com.spacetime.miniapp.dto.response.MiniappSearchConfigVO;
import com.spacetime.miniapp.dto.response.SearchValidationResult;
import com.spacetime.miniapp.service.MiniappSearchConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 小程序搜索配置服务实现
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MiniappSearchConfigServiceImpl implements MiniappSearchConfigService {

    private static final String SEARCH_RESULT_TAB_PAGE = "SEARCH_RESULT_TAB";
    private static final String CONFIG_PREFIX = "config:";
    private static final String CONFIG_KEY_EMPTY_STATE = "search.empty_state_text";
    private static final String CONFIG_KEY_VIOLATION = "search.violation_text";
    private static final String CONFIG_KEY_DEFAULT_SORT = "search.default_sort";

    private final SearchHotWordDao searchHotWordDao;
    private final SearchBlockWordDao searchBlockWordDao;
    private final AppConfigDao appConfigDao;
    private final MobileEntryConfigDao mobileEntryConfigDao;

    @Override
    public List<MiniappHotWordVO> getHotWords(int limit) {
        List<SearchHotWord> words = searchHotWordDao.selectEnabledList(limit);
        return words.stream().map(this::toHotWordVO).collect(Collectors.toList());
    }

    @Override
    public MiniappSearchConfigVO getSearchConfig() {
        List<String> configKeys = Arrays.asList(CONFIG_KEY_EMPTY_STATE, CONFIG_KEY_VIOLATION, CONFIG_KEY_DEFAULT_SORT);
        List<AppConfig> configs = appConfigDao.selectPublicEnabled(configKeys);
        Map<String, String> configMap = configs.stream()
                .collect(Collectors.toMap(AppConfig::getConfigKey, AppConfig::getConfigValue, (a, b) -> a));

        List<MobileEntryConfig> tabEntries = mobileEntryConfigDao.selectEnabledByPageCode(SEARCH_RESULT_TAB_PAGE);
        List<MiniappEntryConfigVO> tabs = tabEntries.stream().map(this::toEntryVO).collect(Collectors.toList());

        MiniappSearchConfigVO vo = new MiniappSearchConfigVO();
        vo.setEmptyStateText(configMap.get(CONFIG_KEY_EMPTY_STATE));
        vo.setViolationText(configMap.get(CONFIG_KEY_VIOLATION));
        vo.setDefaultSort(configMap.get(CONFIG_KEY_DEFAULT_SORT));
        vo.setTabs(tabs);
        return vo;
    }

    @Override
    public SearchValidationResult validateKeyword(String keyword) {
        if (StrUtil.isBlank(keyword)) {
            return new SearchValidationResult(false, null);
        }
        List<SearchBlockWord> blockWords = searchBlockWordDao.selectEnabledList();
        for (SearchBlockWord bw : blockWords) {
            if (SearchBlockTypeEnum.SEARCH_VIOLATION.getCode().equals(bw.getBlockType()) && matches(keyword, bw)) {
                String message = StrUtil.isNotBlank(bw.getHitMessage()) ? bw.getHitMessage() : getViolationFallbackText();
                return new SearchValidationResult(true, message);
            }
        }
        return new SearchValidationResult(false, null);
    }

    private boolean matches(String keyword, SearchBlockWord bw) {
        String matchType = bw.getMatchType();
        String word = bw.getWord();
        if (MatchTypeEnum.EXACT.getCode().equals(matchType)) {
            return keyword.equals(word);
        } else if (MatchTypeEnum.FUZZY.getCode().equals(matchType)) {
            return keyword.contains(word);
        } else if (MatchTypeEnum.PREFIX.getCode().equals(matchType)) {
            return keyword.startsWith(word);
        }
        return false;
    }

    private String getViolationFallbackText() {
        AppConfig config = appConfigDao.selectPublicEnabled(List.of(CONFIG_KEY_VIOLATION)).stream().findFirst().orElse(null);
        return config != null ? config.getConfigValue() : "搜索内容包含违规词";
    }

    private MiniappHotWordVO toHotWordVO(SearchHotWord entity) {
        MiniappHotWordVO vo = new MiniappHotWordVO();
        vo.setWord(entity.getWord());
        vo.setScene(entity.getScene());
        return vo;
    }

    private MiniappEntryConfigVO toEntryVO(MobileEntryConfig entity) {
        MiniappEntryConfigVO vo = new MiniappEntryConfigVO();
        vo.setEntryKey(entity.getEntryKey());
        vo.setEntryName(entity.getEntryName());
        vo.setIcon(entity.getIcon());
        vo.setJumpType(entity.getJumpType());
        vo.setJumpTarget(resolveJumpTarget(entity.getJumpTarget()));
        vo.setBadgeText(entity.getBadgeText());
        vo.setBadgeType(entity.getBadgeType());
        vo.setLoginRequired(entity.getLoginRequired());
        vo.setSort(entity.getSort());
        return vo;
    }

    private String resolveJumpTarget(String jumpTarget) {
        if (StrUtil.isBlank(jumpTarget) || !jumpTarget.startsWith(CONFIG_PREFIX)) {
            return jumpTarget;
        }
        String configKey = jumpTarget.substring(CONFIG_PREFIX.length());
        AppConfig config = appConfigDao.selectPublicEnabled(List.of(configKey)).stream().findFirst().orElse(null);
        return config != null ? config.getConfigValue() : jumpTarget;
    }
}
