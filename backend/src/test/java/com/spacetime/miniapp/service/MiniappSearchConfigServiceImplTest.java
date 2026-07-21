package com.spacetime.miniapp.service;

import com.spacetime.common.dao.AppConfigDao;
import com.spacetime.common.dao.MobileEntryConfigDao;
import com.spacetime.common.dao.SearchBlockWordDao;
import com.spacetime.common.dao.SearchHotWordDao;
import com.spacetime.common.entity.SearchBlockWord;
import com.spacetime.miniapp.dto.response.SearchValidationResult;
import com.spacetime.miniapp.service.impl.MiniappSearchConfigServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("PRD-06 搜索词校验匹配方式测试")
class MiniappSearchConfigServiceImplTest {

    @Mock private SearchHotWordDao searchHotWordDao;
    @Mock private SearchBlockWordDao searchBlockWordDao;
    @Mock private AppConfigDao appConfigDao;
    @Mock private MobileEntryConfigDao mobileEntryConfigDao;

    private MiniappSearchConfigServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new MiniappSearchConfigServiceImpl(
                searchHotWordDao, searchBlockWordDao, appConfigDao, mobileEntryConfigDao);
    }

    @Test
    @DisplayName("历史 PREFIX 数据不再参与 PRD-06 搜索拦截")
    void validateKeyword_shouldIgnoreUnsupportedPrefixMatch() {
        SearchBlockWord word = new SearchBlockWord();
        word.setWord("加");
        word.setBlockType("SEARCH_VIOLATION");
        word.setMatchType("PREFIX");
        when(searchBlockWordDao.selectEnabledList()).thenReturn(List.of(word));

        SearchValidationResult result = service.validateKeyword("加微信");

        assertThat(result.isViolated()).isFalse();
    }
}
