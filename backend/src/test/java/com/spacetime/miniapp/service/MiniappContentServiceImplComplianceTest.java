package com.spacetime.miniapp.service;

import com.spacetime.common.dao.AppConfigDao;
import com.spacetime.common.dao.ContentArticleDao;
import com.spacetime.common.entity.ContentArticle;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.miniapp.dto.response.MiniappArticleDetailVO;
import com.spacetime.miniapp.service.impl.MiniappContentServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("PRD-06 小程序合规内容查询测试")
class MiniappContentServiceImplComplianceTest {

    @Mock private ContentArticleDao contentArticleDao;
    @Mock private AppConfigDao appConfigDao;

    private MiniappContentServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new MiniappContentServiceImpl(contentArticleDao, appConfigDao);
    }

    @Test
    @DisplayName("按内容编码返回当前启用的预置合规内容")
    void getCompliance_shouldReturnEnabledPreinitializedContent() {
        ContentArticle article = article("ENABLED", 1);
        when(contentArticleDao.selectByContentCode("PRIVACY_POLICY")).thenReturn(article);

        MiniappArticleDetailVO result = service.getCompliance("PRIVACY_POLICY");

        assertThat(result.getContentCode()).isEqualTo("PRIVACY_POLICY");
        assertThat(result.getVersion()).isEqualTo("v1.0");
        assertThat(result.getLinkType()).isEqualTo("H5");
        assertThat(result.getEffectiveTime()).isNotBlank();
        assertThat(result.getContentUrl()).isEqualTo("https://m.example.com/privacy");
    }

    @Test
    @DisplayName("停用或非预置内容不可通过合规接口查看")
    void getCompliance_shouldRejectUnavailableContent() {
        when(contentArticleDao.selectByContentCode("PRIVACY_POLICY")).thenReturn(article("DISABLED", 1));

        assertThatThrownBy(() -> service.getCompliance("PRIVACY_POLICY"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("暂不可查看");
    }

    private ContentArticle article(String status, int preinitialized) {
        ContentArticle article = new ContentArticle();
        article.setId(1L);
        article.setContentCode("PRIVACY_POLICY");
        article.setVersion("v1.0");
        article.setPreinitialized(preinitialized);
        article.setTitle("隐私政策");
        article.setType("RULE");
        article.setContentType("H5");
        article.setContentUrl("https://m.example.com/privacy");
        article.setStatus(status);
        article.setEffectiveTime(LocalDateTime.now().minusMinutes(1));
        return article;
    }
}
