package com.spacetime.admin.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.admin.dto.request.ComplianceContentSaveReq;
import com.spacetime.admin.dto.response.ComplianceContentVO;
import com.spacetime.admin.service.impl.ComplianceContentAdminServiceImpl;
import com.spacetime.common.dao.ContentArticleDao;
import com.spacetime.common.dao.ContentOperationLogDao;
import com.spacetime.common.dao.DictDataDao;
import com.spacetime.common.entity.ContentArticle;
import com.spacetime.common.entity.SysDictData;
import com.spacetime.common.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("PRD-06 公告与协议配置服务测试")
class ComplianceContentAdminServiceImplTest {

    @Mock
    private ContentArticleDao contentArticleDao;
    @Mock
    private ContentOperationLogDao contentOperationLogDao;
    @Mock
    private DictDataDao dictDataDao;

    private ComplianceContentAdminServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new ComplianceContentAdminServiceImpl(
                contentArticleDao, contentOperationLogDao, dictDataDao, new ObjectMapper());
    }

    @Test
    @DisplayName("替换 H5 地址时版本从 v1.9 自动升级为 v2.0")
    void update_shouldIncreaseVersionWhenUrlChanged() {
        ContentArticle article = complianceArticle("v1.9", "https://m.example.com/privacy/v1");
        when(contentArticleDao.selectById(1L)).thenReturn(article);
        when(dictDataDao.selectEnabledByTypeAndValue("common_status", "ENABLED"))
                .thenReturn(dictStatus("ENABLED"));

        service.update(1L, saveReq("隐私政策", "https://m.example.com/privacy/v2", "ENABLED"));

        ArgumentCaptor<ContentArticle> captor = ArgumentCaptor.forClass(ContentArticle.class);
        verify(contentArticleDao).updateById(captor.capture());
        assertThat(captor.getValue().getVersion()).isEqualTo("v2.0");
        assertThat(captor.getValue().getEffectiveTime()).isNotNull();
        verify(contentOperationLogDao).insert(org.mockito.ArgumentMatchers.argThat(log ->
                "COMPLIANCE_CONTENT".equals(log.getBizType())
                        && "UPDATE".equals(log.getAction())
                        && log.getBeforeValue().contains("v1.9")
                        && log.getAfterValue().contains("v2.0")));
    }

    @Test
    @DisplayName("仅修改标题或状态时版本保持不变")
    void update_shouldKeepVersionWhenUrlUnchanged() {
        ContentArticle article = complianceArticle("v1.9", "https://m.example.com/privacy/v1");
        when(contentArticleDao.selectById(1L)).thenReturn(article);
        when(dictDataDao.selectEnabledByTypeAndValue("common_status", "DISABLED"))
                .thenReturn(dictStatus("DISABLED"));

        service.update(1L, saveReq("隐私政策（更新）", "https://m.example.com/privacy/v1", "DISABLED"));

        assertThat(article.getVersion()).isEqualTo("v1.9");
        assertThat(article.getTitle()).isEqualTo("隐私政策（更新）");
        assertThat(article.getStatus()).isEqualTo("DISABLED");
    }

    @Test
    @DisplayName("非预初始化内容不允许通过合规配置接口编辑")
    void update_shouldRejectNonPreinitializedArticle() {
        ContentArticle article = complianceArticle("v1.0", "https://m.example.com/privacy/v1");
        article.setPreinitialized(0);
        when(contentArticleDao.selectById(1L)).thenReturn(article);

        assertThatThrownBy(() -> service.update(
                1L, saveReq("隐私政策", "https://m.example.com/privacy/v2", "ENABLED")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("预置");
    }

    @Test
    @DisplayName("详情返回内容编码和服务端版本")
    void detail_shouldReturnComplianceFields() {
        ContentArticle article = complianceArticle("v1.3", "https://m.example.com/privacy/v3");
        when(contentArticleDao.selectById(1L)).thenReturn(article);

        ComplianceContentVO result = service.detail(1L);

        assertThat(result.getContentCode()).isEqualTo("PRIVACY_POLICY");
        assertThat(result.getContentType()).isEqualTo("PRIVACY_POLICY");
        assertThat(result.getVersion()).isEqualTo("v1.3");
        assertThat(result.getLinkType()).isEqualTo("H5");
    }

    @Test
    @DisplayName("状态不在启用字典中时拒绝保存")
    void update_shouldRejectStatusOutsideDictionary() {
        ContentArticle article = complianceArticle("v1.0", "https://m.example.com/privacy/v1");
        when(contentArticleDao.selectById(1L)).thenReturn(article);

        assertThatThrownBy(() -> service.update(
                1L, saveReq("隐私政策", "https://m.example.com/privacy/v1", "UNKNOWN")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("不支持的内容状态");
    }

    private ContentArticle complianceArticle(String version, String url) {
        ContentArticle article = new ContentArticle();
        article.setId(1L);
        article.setContentCode("PRIVACY_POLICY");
        article.setVersion(version);
        article.setPreinitialized(1);
        article.setType("RULE");
        article.setTitle("隐私政策");
        article.setContentType("H5");
        article.setContentUrl(url);
        article.setStatus("ENABLED");
        article.setEffectiveTime(LocalDateTime.now().minusDays(1));
        return article;
    }

    private ComplianceContentSaveReq saveReq(String title, String url, String status) {
        ComplianceContentSaveReq req = new ComplianceContentSaveReq();
        req.setTitle(title);
        req.setContentUrl(url);
        req.setStatus(status);
        return req;
    }

    private SysDictData dictStatus(String value) {
        SysDictData data = new SysDictData();
        data.setDictType("common_status");
        data.setDictValue(value);
        data.setStatus("ENABLED");
        return data;
    }
}
