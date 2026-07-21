package com.spacetime.admin.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.admin.dto.request.SearchBlockWordSaveReq;
import com.spacetime.admin.dto.request.StatusUpdateReq;
import com.spacetime.admin.service.impl.SearchBlockWordAdminServiceImpl;
import com.spacetime.common.dao.ContentOperationLogDao;
import com.spacetime.common.dao.DictDataDao;
import com.spacetime.common.dao.SearchBlockWordDao;
import com.spacetime.common.entity.SearchBlockWord;
import com.spacetime.common.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("PRD-06 搜索屏蔽词服务测试")
class SearchBlockWordAdminServiceImplTest {

    @Mock
    private SearchBlockWordDao searchBlockWordDao;
    @Mock
    private ContentOperationLogDao contentOperationLogDao;
    @Mock
    private DictDataDao dictDataDao;

    private SearchBlockWordAdminServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new SearchBlockWordAdminServiceImpl(
                searchBlockWordDao, contentOperationLogDao, dictDataDao, new ObjectMapper());
    }

    @Test
    @DisplayName("匹配方式只允许精确和包含")
    void create_shouldRejectPrefixMatch() {
        SearchBlockWordSaveReq req = request("联系方式", "PREFIX", "ENABLED");

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("EXACT")
                .hasMessageContaining("FUZZY");

        verify(searchBlockWordDao, never()).insert(any());
    }

    @Test
    @DisplayName("相同词和匹配方式全状态唯一")
    void create_shouldRejectSameWordAndMatchTypeEvenWhenDisabled() {
        SearchBlockWordSaveReq req = request("加微信", "FUZZY", "DISABLED");
        when(dictDataDao.selectEnabledByTypeAndValue("search_block_reason", "illegal_word"))
                .thenReturn(new com.spacetime.common.entity.SysDictData());
        SearchBlockWord existing = new SearchBlockWord();
        existing.setId(9L);
        when(searchBlockWordDao.selectByWordAndMatchType("加微信", "FUZZY")).thenReturn(existing);

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("匹配方式")
                .hasMessageContaining("已存在");
    }

    @Test
    @DisplayName("屏蔽原因必须来自启用字典")
    void create_shouldRejectUnknownReasonCode() {
        SearchBlockWordSaveReq req = request("加微信", "FUZZY", "ENABLED");

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("屏蔽原因")
                .hasMessageContaining("字典");

        verify(searchBlockWordDao, never()).insert(any());
    }

    @Test
    @DisplayName("启停时记录词条、原因和前后状态")
    void updateStatus_shouldWriteCompleteAudit() {
        SearchBlockWord entity = new SearchBlockWord();
        entity.setId(1L);
        entity.setWord("约炮");
        entity.setBlockType("SEARCH_VIOLATION");
        entity.setMatchType("EXACT");
        entity.setReasonCode("illegal_word");
        entity.setStatus("ENABLED");
        when(searchBlockWordDao.selectById(1L)).thenReturn(entity);

        StatusUpdateReq req = new StatusUpdateReq();
        req.setStatus("DISABLED");
        service.updateStatus(1L, req);

        verify(contentOperationLogDao).insert(org.mockito.ArgumentMatchers.argThat(log ->
                log.getBeforeValue().contains("约炮")
                        && log.getBeforeValue().contains("illegal_word")
                        && log.getBeforeValue().contains("ENABLED")
                        && log.getAfterValue().contains("DISABLED")));
    }

    private SearchBlockWordSaveReq request(String word, String matchType, String status) {
        SearchBlockWordSaveReq req = new SearchBlockWordSaveReq();
        req.setWord(word);
        req.setBlockType("SEARCH_VIOLATION");
        req.setMatchType(matchType);
        req.setReasonCode("illegal_word");
        req.setStatus(status);
        return req;
    }
}
