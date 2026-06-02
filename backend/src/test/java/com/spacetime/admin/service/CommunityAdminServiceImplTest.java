package com.spacetime.admin.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.*;
import com.spacetime.common.constant.CommunityConfigKeys;
import com.spacetime.common.dao.*;
import com.spacetime.common.entity.*;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.admin.service.impl.CommunityAdminServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
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

    @InjectMocks private CommunityAdminServiceImpl communityAdminService;

    private CommunityPost post;
    private CommunityComment comment;
    private CommunityReport report;

    @BeforeEach
    void setUp() {
        post = new CommunityPost();
        post.setId(100L);
        post.setAuthorId(2L);
        post.setStatus("PENDING");
        post.setAuditStatus("PENDING");
        post.setCreateTime(LocalDateTime.now());
        post.setUpdateTime(LocalDateTime.now());

        comment = new CommunityComment();
        comment.setId(200L);
        comment.setPostId(100L);
        comment.setAuthorId(3L);
        comment.setStatus("PUBLISHED");
        comment.setAuditStatus("PENDING");
        comment.setCreateTime(LocalDateTime.now());
        comment.setUpdateTime(LocalDateTime.now());

        report = new CommunityReport();
        report.setId(300L);
        report.setReporterId(4L);
        report.setTargetType("post");
        report.setTargetId(100L);
        report.setReasonCode("spam");
        report.setStatus("PENDING");
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
                "APPROVED".equals(item.getAuditStatus()) && "PUBLISHED".equals(item.getStatus())));
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
                "REJECTED".equals(item.getAuditStatus()) && "REJECTED".equals(item.getStatus())));
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

        verify(communityPostDao).updateById(argThat(item -> "BLOCKED".equals(item.getStatus())));
        verify(communityReportDao).updateById(argThat(item -> "RESOLVED".equals(item.getStatus())));
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
                .hasMessageContaining("不支持的处理动作");
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
}
