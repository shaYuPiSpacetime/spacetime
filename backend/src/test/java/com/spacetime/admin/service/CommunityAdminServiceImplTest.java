package com.spacetime.admin.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.*;
import com.spacetime.common.constant.CommunityConfigKeys;
import com.spacetime.common.dao.*;
import com.spacetime.common.entity.*;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.admin.service.impl.CommunityAdminServiceImpl;
import com.spacetime.common.util.OssUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PRD-05 CommunityAdminService L3 测试")
class CommunityAdminServiceImplTest {

    @Mock private CommunityPostDao communityPostDao;
    @Mock private CommunityCommentDao communityCommentDao;
    @Mock private CommunityReportDao communityReportDao;
    @Mock private AppConfigDao appConfigDao;
    @Mock private MobileEntryConfigDao mobileEntryConfigDao;
    @Mock private DictDataDao dictDataDao;
    @Mock private UserDao userDao;
    @Mock private ContentOperationLogDao contentOperationLogDao;
    @Mock private CommunityExtensionDao communityExtensionDao;
    @Mock private AppUserAdminService appUserAdminService;
    @Mock private OssUtil ossUtil;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private CommunityAdminServiceImpl communityAdminService;

    private CommunityPost post;
    private CommunityComment comment;
    private CommunityReport report;

    @BeforeEach
    void setUp() {
        communityAdminService = new CommunityAdminServiceImpl(communityPostDao, communityCommentDao,
                communityReportDao, appConfigDao, mobileEntryConfigDao, dictDataDao, userDao,
                contentOperationLogDao, communityExtensionDao, appUserAdminService, ossUtil, objectMapper);
        post = new CommunityPost();
        post.setId(100L);
        post.setAuthorId(2L);
        post.setStatus("pending_machine");
        post.setAuditStatus("PENDING");
        post.setCreateTime(LocalDateTime.now());
        post.setUpdateTime(LocalDateTime.now());

        comment = new CommunityComment();
        comment.setId(200L);
        comment.setPostId(100L);
        comment.setAuthorId(3L);
        comment.setStatus("published");
        comment.setAuditStatus("PENDING");
        comment.setCreateTime(LocalDateTime.now());
        comment.setUpdateTime(LocalDateTime.now());

        report = new CommunityReport();
        report.setId(300L);
        report.setReporterId(4L);
        report.setTargetType("post");
        report.setTargetId("100");
        report.setReasonCode("spam");
        report.setStatus("pending");
        report.setCreateTime(LocalDateTime.now());
        report.setUpdateTime(LocalDateTime.now());
    }

    @Test
    @DisplayName("审核通过内容")
    void auditPost_approve_shouldUpdateStatus() {
        CommunityPostAuditReq req = new CommunityPostAuditReq();
        req.setAuditStatus("APPROVED");
        req.setAuditRemark("通过");

        when(communityPostDao.selectById(100L)).thenReturn(post);

        communityAdminService.auditPost(100L, req);

        verify(communityPostDao).updateById(argThat(item ->
                "APPROVED".equals(item.getAuditStatus()) && "published".equals(item.getStatus())));
        verify(contentOperationLogDao).insert(any());
    }

    @Test
    @DisplayName("驳回评论")
    void auditComment_reject_shouldUpdateStatus() {
        CommunityCommentAuditReq req = new CommunityCommentAuditReq();
        req.setAuditStatus("REJECTED");
        req.setAuditRemark("违规");

        when(communityCommentDao.selectById(200L)).thenReturn(comment);

        communityAdminService.auditComment(200L, req);

        verify(communityCommentDao).updateById(argThat(item ->
                "REJECTED".equals(item.getAuditStatus()) && "rejected".equals(item.getStatus())));
    }

    @Test
    @DisplayName("处理举报-下架动态")
    void handleReport_blockPost_shouldUpdatePost() {
        CommunityReportHandleReq req = new CommunityReportHandleReq();
        req.setStatus("RESOLVED");
        req.setHandleAction("BLOCK_POST");
        req.setHandleRemark("确认违规");

        when(communityReportDao.selectById(300L)).thenReturn(report);
        when(communityPostDao.selectById(100L)).thenReturn(post);

        communityAdminService.handleReport(300L, req);

        verify(communityPostDao).updateById(argThat(item -> "blocked".equals(item.getStatus())));
        verify(communityReportDao).updateById(argThat(item -> "valid".equals(item.getStatus())));
    }

    @Test
    @DisplayName("处理举报-非法动作")
    void handleReport_invalidAction_shouldThrow() {
        CommunityReportHandleReq req = new CommunityReportHandleReq();
        req.setStatus("RESOLVED");
        req.setHandleAction("INVALID");

        when(communityReportDao.selectById(300L)).thenReturn(report);

        assertThatThrownBy(() -> communityAdminService.handleReport(300L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessage("unsupported_handle_action");
    }

    @Test
    @DisplayName("社区配置查询")
    void getCommunityConfigs_shouldReturnDefaults() {
        AppConfig config = new AppConfig();
        config.setConfigKey(CommunityConfigKeys.INTERACTION_GATE_MODE);
        config.setConfigValue("LOGIN_ONLY");
        when(appConfigDao.selectByKeys(any())).thenReturn(List.of(config));

        communityAdminService.getCommunityConfigs();

        verify(appConfigDao).selectByKeys(any());
    }

    @Test
    @DisplayName("社区配置按四个业务分区返回且准入模式使用动态选项")
    void getConfigVersion_shouldReturnFourSectionsAndDynamicOptions() {
        when(appConfigDao.selectByKeys(any())).thenReturn(List.of());
        when(communityExtensionDao.selectConfigVersionOne(any())).thenReturn(null);
        when(communityExtensionDao.selectAudits(any())).thenReturn(List.of());
        when(dictDataDao.selectByDictType(anyString())).thenReturn(List.of());
        when(dictDataDao.selectList(any())).thenReturn(List.of());

        var result = communityAdminService.getConfigVersion();

        assertThat(result.getItems()).hasSize(13);
        assertThat(result.getSections()).extracting("code")
                .containsExactly("entry", "audit", "report", "governance");
        assertThat(result.getItems()).filteredOn(item -> CommunityConfigKeys.INTERACTION_GATE_MODE.equals(item.getConfigKey()))
                .singleElement().extracting("optionsKey").isEqualTo("interactionGateMode");
    }

    @Test
    @DisplayName("历史举报原因停用后仍返回字典显示名")
    void getReportDetail_disabledReason_shouldReturnHistoricalLabel() {
        report.setReasonCode("abuse");
        SysDictData historicalReason = new SysDictData();
        historicalReason.setDictType("community_report_reason");
        historicalReason.setDictValue("abuse");
        historicalReason.setDictLabel("辱骂攻击");
        historicalReason.setStatus("DISABLED");

        when(communityReportDao.selectById(300L)).thenReturn(report);
        when(communityPostDao.selectById(100L)).thenReturn(post);
        when(dictDataDao.selectByDictType(anyString())).thenReturn(List.of());
        when(dictDataDao.selectList(any())).thenReturn(List.of(historicalReason));
        when(communityExtensionDao.selectAudits(any())).thenReturn(List.of());

        assertThat(communityAdminService.getReportDetail(300L).getReasonLabel()).isEqualTo("辱骂攻击");
    }

    @Test
    @DisplayName("动态列表批量加载关联数据且不读取详情审核日志")
    void getPostPage_multipleRows_shouldUseConstantRelationQueries() {
        CommunityPost secondPost = new CommunityPost();
        secondPost.setId(101L);
        secondPost.setAuthorId(2L);
        secondPost.setStatus("published");
        secondPost.setContent("第二条动态");
        secondPost.setCreateTime(LocalDateTime.now());
        secondPost.setUpdateTime(LocalDateTime.now());
        post.setContent("第一条动态");

        Page<CommunityPost> page = new Page<>(1, 20, 2);
        page.setRecords(List.of(post, secondPost));
        SysUser author = new SysUser();
        author.setId(2L);
        author.setNickname("同一作者");

        when(communityPostDao.selectPage(any(), any())).thenReturn(page);
        when(userDao.selectByIds(any())).thenReturn(List.of(author));
        when(dictDataDao.selectList(any())).thenReturn(List.of());

        Page<?> result = communityAdminService.getPostPage(new CommunityPostPageReq());

        assertThat(result.getRecords()).hasSize(2);
        verify(userDao, times(1)).selectByIds(any());
        verify(userDao, never()).selectById(any());
        verify(communityExtensionDao, never()).selectTopicById(any());
        verify(communityExtensionDao, never()).selectAudits(any());
        verify(dictDataDao, times(2)).selectList(any());
        verify(dictDataDao, never()).selectByDictType(anyString());
    }
}
