package com.spacetime.admin.service;

import com.spacetime.admin.dto.request.ContentArticleSaveReq;
import com.spacetime.admin.dto.request.StatusUpdateReq;
import com.spacetime.admin.service.impl.ContentArticleAdminServiceImpl;
import com.spacetime.common.dao.ContentArticleDao;
import com.spacetime.common.dao.ContentOperationLogDao;
import com.spacetime.common.entity.ContentArticle;
import com.spacetime.common.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("PRD-06 预置合规内容通用接口防绕过测试")
class ContentArticleAdminServiceComplianceGuardTest {

    @Mock private ContentArticleDao contentArticleDao;
    @Mock private ContentOperationLogDao contentOperationLogDao;

    private ContentArticleAdminServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new ContentArticleAdminServiceImpl(contentArticleDao, contentOperationLogDao);
    }

    @Test
    @DisplayName("通用内容删除接口不得删除预初始化合规内容")
    void delete_shouldRejectPreinitializedContent() {
        ContentArticle article = preinitializedArticle();
        when(contentArticleDao.selectById(1L)).thenReturn(article);

        assertThatThrownBy(() -> service.delete(1L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("公告与协议配置");

        verify(contentArticleDao, never()).deleteById(1L);
    }

    @Test
    @DisplayName("通用内容编辑和启停接口不得绕过受控合规编辑")
    void update_shouldRejectPreinitializedContent() {
        ContentArticle article = preinitializedArticle();
        when(contentArticleDao.selectById(1L)).thenReturn(article);

        assertThatThrownBy(() -> service.update(1L, new ContentArticleSaveReq()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("公告与协议配置");

        StatusUpdateReq statusReq = new StatusUpdateReq();
        statusReq.setStatus("DISABLED");
        assertThatThrownBy(() -> service.updateStatus(1L, statusReq))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("公告与协议配置");
    }

    private ContentArticle preinitializedArticle() {
        ContentArticle article = new ContentArticle();
        article.setId(1L);
        article.setContentCode("PRIVACY_POLICY");
        article.setPreinitialized(1);
        return article;
    }
}
