package com.spacetime.admin.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.*;
import com.spacetime.admin.dto.response.CommunityConfigItemVO;
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
import java.beans.Introspector;
import java.util.Arrays;
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
    @Mock private AppUserDao appUserDao;
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
                appUserDao, contentOperationLogDao, communityExtensionDao, appUserAdminService, ossUtil, objectMapper);
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
        AppUser author = new AppUser();
        author.setId(2L);
        author.setNickname("同一作者");

        when(communityPostDao.selectPage(any(), any())).thenReturn(page);
        when(appUserDao.selectByIds(any())).thenReturn(List.of(author));
        when(dictDataDao.selectList(any())).thenReturn(List.of());

        Page<?> result = communityAdminService.getPostPage(new CommunityPostPageReq());

        assertThat(result.getRecords()).hasSize(2);
        verify(appUserDao, times(1)).selectByIds(any());
        verify(appUserDao, never()).selectById(any());
        verify(communityExtensionDao, never()).selectTopicById(any());
        verify(communityExtensionDao, never()).selectAudits(any());
        verify(dictDataDao, times(2)).selectList(any());
        verify(dictDataDao, never()).selectByDictType(anyString());
    }

    @Test
    @DisplayName("评论详情返回完整所属动态上下文")
    void getCommentDetail_shouldReturnCurrentPostContext() {
        post.setPostNo("P-100");
        post.setPostType("community_post");
        post.setTitle("周末露营计划");
        post.setContent("周末一起去露营，欢迎带上你的宠物。详情内容不能只剩摘要。");
        post.setImageUrls("[\"https://cdn.example.com/1.webp\",\"https://cdn.example.com/2.webp\"]");
        post.setSourceScene("qianxun_chengjia");
        post.setStatus("published");
        when(communityCommentDao.selectById(200L)).thenReturn(comment);
        when(communityPostDao.selectById(100L)).thenReturn(post);
        when(dictDataDao.selectByDictType(anyString())).thenReturn(List.of());
        when(dictDataDao.selectList(any())).thenReturn(List.of());
        when(communityExtensionDao.selectAudits(any())).thenReturn(List.of());

        var result = communityAdminService.getCommentDetail(200L);

        assertThat(result).extracting(
                        "postAvailable", "postNo", "postType", "postTitle", "postContent",
                        "postImageUrls", "postSourceScene", "postStatus")
                .containsExactly(
                        true, "P-100", "community_post", "周末露营计划",
                        "周末一起去露营，欢迎带上你的宠物。详情内容不能只剩摘要。",
                        List.of("https://cdn.example.com/1.webp", "https://cdn.example.com/2.webp"),
                        "qianxun_chengjia", "published");
    }

    @Test
    @DisplayName("评论列表批量加载所属内容且不读取详情审核日志")
    void getCommentPage_multipleRows_shouldUseConstantRelationQueries() {
        CommunityComment secondComment = new CommunityComment();
        secondComment.setId(201L);
        secondComment.setPostId(100L);
        secondComment.setAuthorId(4L);
        secondComment.setParentCommentId(200L);
        secondComment.setStatus("published");
        secondComment.setContent("第二条评论");
        secondComment.setCreateTime(LocalDateTime.now());
        secondComment.setUpdateTime(LocalDateTime.now());
        comment.setContent("第一条评论");
        Page<CommunityComment> page = new Page<>(1, 20, 2);
        page.setRecords(List.of(comment, secondComment));

        when(communityCommentDao.selectPage(any(), any())).thenReturn(page);
        when(appUserDao.selectByIds(any())).thenReturn(List.of());
        when(communityPostDao.selectList(any())).thenReturn(List.of(post));
        when(communityCommentDao.selectList(any())).thenReturn(List.of(comment));
        when(dictDataDao.selectList(any())).thenReturn(List.of());

        Page<?> result = communityAdminService.getCommentPage(new CommunityCommentPageReq());

        assertThat(result.getRecords()).hasSize(2);
        verify(appUserDao, times(1)).selectByIds(any());
        verify(appUserDao, never()).selectById(any());
        verify(communityPostDao, times(1)).selectList(any());
        verify(communityPostDao, never()).selectById(any());
        verify(communityCommentDao, times(1)).selectList(any());
        verify(communityCommentDao, never()).selectById(any());
        verify(communityExtensionDao, never()).selectAudits(any());
        verify(dictDataDao, times(2)).selectList(any());
        verify(dictDataDao, never()).selectByDictType(anyString());
    }

    @Test
    @DisplayName("评论筛选请求支持页面实际提交的全部字段")
    void commentPageRequest_shouldExposeFrontendFilterFields() throws Exception {
        List<String> properties = Arrays.stream(Introspector.getBeanInfo(CommunityCommentPageReq.class)
                        .getPropertyDescriptors())
                .map(item -> item.getName())
                .toList();

        assertThat(properties).contains("userId", "postNo", "reported", "startTime", "endTime");
    }

    @Test
    @DisplayName("家园话题列表批量统计且完整返回封面")
    void getTopicPage_multipleRows_shouldBatchStatsAndReturnCovers() {
        CommunityTopic first = new CommunityTopic();
        first.setId(11L);
        first.setTopicCode("camp");
        first.setTopicName("露营交友");
        first.setCoverUrl("https://cdn.example.com/camping.webp");
        first.setStatus("enabled");
        first.setRecommended(1);
        first.setSort(10);
        first.setCreateTime(LocalDateTime.now());
        first.setUpdateTime(LocalDateTime.now());
        CommunityTopic second = new CommunityTopic();
        second.setId(12L);
        second.setTopicCode("coffee_chat");
        second.setTopicName("咖啡碰面");
        second.setCoverUrl("https://cdn.example.com/coffee.webp");
        second.setStatus("enabled");
        second.setRecommended(0);
        second.setSort(20);
        second.setCreateTime(LocalDateTime.now());
        second.setUpdateTime(LocalDateTime.now());
        Page<CommunityTopic> page = new Page<>(1, 20, 2);
        page.setRecords(List.of(first, second));

        CommunityPost firstPost = new CommunityPost();
        firstPost.setId(501L);
        firstPost.setTopicId(11L);
        firstPost.setLikeCount(8);
        firstPost.setCommentCount(3);
        CommunityPost secondPost = new CommunityPost();
        secondPost.setId(502L);
        secondPost.setTopicId(12L);
        secondPost.setLikeCount(5);
        secondPost.setCommentCount(2);
        when(communityExtensionDao.selectTopicPage(any(), any())).thenReturn(page);
        when(communityPostDao.selectList(any())).thenReturn(List.of(firstPost, secondPost));
        when(dictDataDao.selectList(any())).thenReturn(List.of());

        Page<?> result = communityAdminService.getTopicPage(new CommunityTopicPageReq());

        assertThat(result.getRecords()).extracting("coverUrl")
                .containsExactly("https://cdn.example.com/camping.webp", "https://cdn.example.com/coffee.webp");
        assertThat(result.getRecords()).extracting("contentCount").containsExactly(1L, 1L);
        assertThat(result.getRecords()).extracting("heatValue").containsExactly(11L, 7L);
        verify(communityPostDao, times(1)).selectList(any());
        verify(dictDataDao, times(1)).selectList(any());
        verify(dictDataDao, never()).selectByDictType(anyString());
        verify(communityExtensionDao, never()).selectAudits(any());
    }

    @Test
    @DisplayName("家园话题筛选请求支持页面日期字段")
    void topicPageRequest_shouldExposeFrontendDateFields() throws Exception {
        List<String> properties = Arrays.stream(Introspector.getBeanInfo(CommunityTopicPageReq.class)
                        .getPropertyDescriptors())
                .map(item -> item.getName())
                .toList();

        assertThat(properties).contains("startTime", "endTime");
    }

    @Test
    @DisplayName("启用中的家园话题名称不可重复")
    void createTopic_duplicateEnabledName_shouldReject() {
        CommunityTopic existing = new CommunityTopic();
        existing.setId(11L);
        existing.setTopicName("露营交友");
        existing.setStatus("enabled");
        when(communityExtensionDao.selectTopics(any())).thenReturn(List.of(existing));

        CommunityTopicSaveReq req = topicRequest("露营交友",
                "https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/community/topics/camping.webp");

        assertThatThrownBy(() -> communityAdminService.createTopic(req))
                .isInstanceOf(BusinessException.class)
                .hasMessage("topic_name_duplicate");
        verify(communityExtensionDao, never()).insertTopic(any());
    }

    @Test
    @DisplayName("家园话题封面只接受平台OSS公网地址")
    void createTopic_externalCoverHost_shouldReject() {
        CommunityTopicSaveReq req = topicRequest("咖啡碰面",
                "https://third-party.example.com/community/topics/coffee.webp");

        assertThatThrownBy(() -> communityAdminService.createTopic(req))
                .isInstanceOf(BusinessException.class)
                .hasMessage("topic_cover_url_invalid");
        verify(communityExtensionDao, never()).insertTopic(any());
    }

    @Test
    @DisplayName("普通配置变更不被未修改的高风险项阻断且保持公共可见")
    void saveConfigVersion_normalChange_shouldIgnoreUnchangedHighRiskItemAndStayPublic() throws Exception {
        CommunityConfigVersion latest = new CommunityConfigVersion();
        latest.setVersion(1);
        latest.setVersionNo("community-v1");
        latest.setConfigSnapshot(objectMapper.writeValueAsString(List.of(
                configSnapshotItem(CommunityConfigKeys.POST_MAX_IMAGES, 9, false),
                configSnapshotItem(CommunityConfigKeys.INTERACTION_GATE_MODE, "FULL_CERT", true)
        )));
        when(communityExtensionDao.selectConfigVersionOne(any())).thenReturn(latest);
        when(communityExtensionDao.selectAudits(any())).thenReturn(List.of());
        AppConfig imageLimit = configEntity(CommunityConfigKeys.POST_MAX_IMAGES, "9", "NUMBER", 1);
        AppConfig gateMode = configEntity(CommunityConfigKeys.INTERACTION_GATE_MODE, "FULL_CERT", "TEXT", 1);
        when(appConfigDao.selectByKeys(any())).thenReturn(List.of(imageLimit, gateMode));

        CommunityConfigVersionSaveReq req = new CommunityConfigVersionSaveReq();
        req.setVersion(1);
        req.setHighRiskConfirmed(false);
        req.setItems(List.of(
                configRequestItem(CommunityConfigKeys.POST_MAX_IMAGES, 12, false),
                configRequestItem(CommunityConfigKeys.INTERACTION_GATE_MODE, "FULL_CERT", true)
        ));

        communityAdminService.saveConfigVersion(req);

        verify(appConfigDao).upsert(argThat(item -> CommunityConfigKeys.POST_MAX_IMAGES.equals(item.getConfigKey())
                && "12".equals(item.getConfigValue()) && Integer.valueOf(1).equals(item.getPublicVisible())));
        verify(communityExtensionDao).insertConfigVersion(any());
    }

    @Test
    @DisplayName("已结束举报不可重复处理")
    void updateReportStatus_terminalReport_shouldRejectRepeatedPunishment() {
        report.setStatus("valid");
        report.setVersion(1);
        CommunityReportStatusReq req = new CommunityReportStatusReq();
        req.setVersion(1);
        req.setResult("valid");
        req.setPunishAction("none");
        req.setHandleRemark("重复处理");
        when(communityReportDao.selectById(300L)).thenReturn(report);

        assertThatThrownBy(() -> communityAdminService.updateReportStatus(300L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessage("report_already_handled");
        verify(communityReportDao, never()).updateCas(any(), anyInt());
    }

    @Test
    @DisplayName("用户已删除内容不可被后台重新公开")
    void updatePostStatus_deletedPost_shouldRejectRestore() {
        post.setStatus("deleted");
        post.setDeletedByUser(1);
        post.setVersion(1);
        CommunityStatusCommandReq req = new CommunityStatusCommandReq();
        req.setVersion(1);
        req.setAction("restore");
        when(communityPostDao.selectById(100L)).thenReturn(post);

        assertThatThrownBy(() -> communityAdminService.updatePostStatus(100L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessage("invalid_status_transition");
        verify(communityPostDao, never()).updateCas(any(), anyInt());
    }

    @Test
    @DisplayName("内容作者使用小程序用户域而不是后台管理员域")
    void getPostDetail_shouldResolveMiniappUserIdentity() {
        post.setPostNo("P-100");
        post.setContent("小程序用户发布的动态");
        post.setStatus("published");
        AppUser miniappUser = new AppUser();
        miniappUser.setId(2L);
        miniappUser.setNickname("小程序用户");
        miniappUser.setPhone("17366629764");
        when(communityPostDao.selectById(100L)).thenReturn(post);
        when(appUserDao.selectById(2L)).thenReturn(miniappUser);
        when(dictDataDao.selectByDictType(anyString())).thenReturn(List.of());
        when(dictDataDao.selectList(any())).thenReturn(List.of());
        when(communityExtensionDao.selectAudits(any())).thenReturn(List.of());

        var result = communityAdminService.getPostDetail(100L);

        assertThat(result.getAuthorNo()).isEqualTo("USR-000000000002");
        assertThat(result.getAuthorName()).isEqualTo("小程序用户");
        verify(userDao, never()).selectById(2L);
    }

    @Test
    @DisplayName("动态与举报筛选请求覆盖页面实际参数")
    void postAndReportPageRequests_shouldExposeFrontendFilterFields() throws Exception {
        List<String> postProperties = Arrays.stream(Introspector.getBeanInfo(CommunityPostPageReq.class)
                        .getPropertyDescriptors()).map(item -> item.getName()).toList();
        List<String> reportProperties = Arrays.stream(Introspector.getBeanInfo(CommunityReportPageReq.class)
                        .getPropertyDescriptors()).map(item -> item.getName()).toList();

        assertThat(postProperties).contains("scope", "contentType", "sourceScene", "mediaType",
                "machineResult", "distributionScene", "reported", "startTime", "endTime");
        assertThat(reportProperties).contains("keyword", "startTime", "endTime");
    }

    @Test
    @DisplayName("举报列表批量加载用户和字典且不查询详情上下文")
    void getReportPage_multipleRows_shouldAvoidNPlusOne() {
        CommunityReport second = new CommunityReport();
        second.setId(301L);
        second.setReporterId(5L);
        second.setTargetUserId(6L);
        second.setTargetType("comment");
        second.setTargetId("200");
        second.setReasonCode("abuse");
        second.setStatus("pending");
        second.setHandlerId(9L);
        second.setCreateTime(LocalDateTime.now());
        second.setUpdateTime(LocalDateTime.now());
        Page<CommunityReport> page = new Page<>(1, 20, 2);
        page.setRecords(List.of(report, second));

        AppUser reporter = new AppUser();
        reporter.setId(4L);
        reporter.setNickname("举报用户甲");
        AppUser otherReporter = new AppUser();
        otherReporter.setId(5L);
        otherReporter.setNickname("举报用户乙");
        AppUser target = new AppUser();
        target.setId(6L);
        target.setNickname("被举报用户");
        SysUser handler = new SysUser();
        handler.setId(9L);
        handler.setNickname("审核员");
        when(communityReportDao.selectPage(any(), any())).thenReturn(page);
        when(appUserDao.selectByIds(any())).thenReturn(List.of(reporter, otherReporter, target));
        when(userDao.selectByIds(any())).thenReturn(List.of(handler));
        when(dictDataDao.selectList(any())).thenReturn(List.of());

        Page<?> result = communityAdminService.getReportPage(new CommunityReportPageReq());

        assertThat(result.getRecords()).extracting("reporterName")
                .containsExactly("举报用户甲", "举报用户乙");
        verify(appUserDao, times(1)).selectByIds(any());
        verify(appUserDao, never()).selectById(any());
        verify(userDao, times(1)).selectByIds(any());
        verify(userDao, never()).selectById(any());
        verify(communityReportDao, never()).selectById(any());
        verify(communityExtensionDao, never()).selectAudits(any());
        verify(dictDataDao, times(2)).selectList(any());
        verify(dictDataDao, never()).selectByDictType(anyString());
    }

    @Test
    @DisplayName("动态处理勾选通知用户时写入可靠事件")
    void updatePostStatus_notifyUser_shouldWriteOutbox() {
        post.setPostNo("POST-100");
        post.setStatus("pending_manual");
        post.setVersion(1);
        CommunityStatusCommandReq req = new CommunityStatusCommandReq();
        req.setAction("approve");
        req.setVersion(1);
        req.setReason("人工审核通过");
        req.setNotifyUser(true);
        when(communityPostDao.selectById(100L)).thenReturn(post);
        when(communityPostDao.updateCas(any(), eq(1))).thenReturn(1);

        communityAdminService.updatePostStatus(100L, req);

        verify(communityExtensionDao).insertOutbox(argThat(event ->
                "moderation_result".equals(event.getEventType())
                        && "post".equals(event.getAggregateType())
                        && event.getPayload().contains("\"recipientUserId\":2")
                        && event.getPayload().contains("\"result\":\"published\"")));
    }

    @Test
    @DisplayName("举报处理勾选回复举报人时写入可靠事件")
    void updateReportStatus_replyReporter_shouldWriteOutbox() {
        report.setReportNo("RPT-300");
        report.setVersion(1);
        CommunityReportStatusReq req = new CommunityReportStatusReq();
        req.setResult("invalid");
        req.setPunishAction("none");
        req.setVersion(1);
        req.setHandleRemark("证据不足");
        req.setReplyReporter(true);
        when(communityReportDao.selectById(300L)).thenReturn(report);
        when(communityReportDao.updateCas(any(), eq(1))).thenReturn(1);

        communityAdminService.updateReportStatus(300L, req);

        verify(communityExtensionDao).insertOutbox(argThat(event ->
                "report_result".equals(event.getEventType())
                        && "report".equals(event.getAggregateType())
                        && event.getPayload().contains("\"recipientUserId\":4")
                        && event.getPayload().contains("\"result\":\"invalid\"")));
    }

    @Test
    @DisplayName("评论警告用户保留公开状态并写入通知事件")
    void updateCommentStatus_warnUser_shouldKeepStatusAndNotify() {
        comment.setCommentNo("CMT-200");
        comment.setStatus("published");
        comment.setVersion(1);
        CommunityStatusCommandReq req = new CommunityStatusCommandReq();
        req.setAction("warn_user");
        req.setVersion(1);
        req.setReason("请文明交流");
        when(communityCommentDao.selectById(200L)).thenReturn(comment);
        when(communityCommentDao.updateCas(any(), eq(1))).thenReturn(1);

        communityAdminService.updateCommentStatus(200L, req);

        assertThat(comment.getStatus()).isEqualTo("published");
        verify(communityExtensionDao).insertOutbox(argThat(event ->
                "moderation_result".equals(event.getEventType())
                        && event.getPayload().contains("\"recipientUserId\":3")
                        && event.getPayload().contains("\"result\":\"warn_user\"")));
    }

    @Test
    @DisplayName("已公开评论允许驳回并触发帖子计数同步")
    void updateCommentStatus_publishedComment_shouldAllowReject() {
        comment.setCommentNo("CMT-200");
        comment.setStatus("published");
        comment.setVersion(1);
        CommunityStatusCommandReq req = new CommunityStatusCommandReq();
        req.setAction("rejected");
        req.setVersion(1);
        req.setReason("违规内容");
        when(communityCommentDao.selectById(200L)).thenReturn(comment);
        when(communityCommentDao.updateCas(any(), eq(1))).thenReturn(1);
        CommunityPost parent = new CommunityPost();
        parent.setId(100L);
        parent.setCommentCount(2);
        when(communityPostDao.selectById(100L)).thenReturn(parent);

        communityAdminService.updateCommentStatus(200L, req);

        assertThat(comment.getStatus()).isEqualTo("rejected");
        verify(communityPostDao).updateById(argThat(value -> value.getCommentCount() == 1));
    }

    @Test
    @DisplayName("举报目标内容已变化时详情仍可打开并明确显示不可用")
    void getReportDetail_missingTarget_shouldReturnUnavailableContext() {
        report.setReportNo("RPT-300");
        when(communityReportDao.selectById(300L)).thenReturn(report);
        when(dictDataDao.selectByDictType(anyString())).thenReturn(List.of());
        when(dictDataDao.selectList(any())).thenReturn(List.of());
        when(communityExtensionDao.selectAudits(any())).thenReturn(List.of());
        when(communityPostDao.selectById(100L)).thenReturn(null);

        var result = communityAdminService.getReportDetail(300L);

        assertThat(result.getContext().getAvailable()).isFalse();
        assertThat(result.getContext().getUnavailableReason()).isEqualTo("content_not_found");
    }

    @Test
    @DisplayName("聊天举报详情优先展示提交时固化的可信证据")
    void getReportDetail_chatTarget_shouldExposeTrustedEvidence() {
        report.setReportNo("RPT-CHAT-300");
        report.setTargetType("chat");
        report.setTargetId("MSG-100");
        report.setSourceType("private_chat");
        report.setContextJson("{\"sourceType\":\"private_chat\",\"targetNo\":\"MSG-100\"}");
        report.setEvidenceJson("{\"content\":\"这是服务端固化的被举报消息\"}");
        when(communityReportDao.selectById(300L)).thenReturn(report);
        when(dictDataDao.selectByDictType(anyString())).thenReturn(List.of());
        when(dictDataDao.selectList(any())).thenReturn(List.of());
        when(communityExtensionDao.selectAudits(any())).thenReturn(List.of());

        var result = communityAdminService.getReportDetail(300L);

        assertThat(result.getContext().getAvailable()).isTrue();
        assertThat(result.getContext().getContent()).contains("服务端固化的被举报消息");
    }

    @Test
    @DisplayName("举报成立并警告用户时通知被举报用户")
    void updateReportStatus_warnUser_shouldNotifyTargetUser() {
        report.setReportNo("RPT-300");
        report.setTargetUserId(6L);
        report.setVersion(1);
        CommunityReportStatusReq req = new CommunityReportStatusReq();
        req.setResult("valid");
        req.setPunishAction("warn_user");
        req.setVersion(1);
        req.setHandleRemark("请遵守社区规范");
        req.setReplyReporter(false);
        when(communityReportDao.selectById(300L)).thenReturn(report);
        when(communityReportDao.updateCas(any(), eq(1))).thenReturn(1);

        communityAdminService.updateReportStatus(300L, req);

        verify(communityExtensionDao).insertOutbox(argThat(event ->
                "moderation_result".equals(event.getEventType())
                        && event.getPayload().contains("\"recipientUserId\":6")
                        && event.getPayload().contains("\"result\":\"warn_user\"")));
    }

    private CommunityConfigItemVO configSnapshotItem(String key, Object value, boolean highRisk) {
        CommunityConfigItemVO item = new CommunityConfigItemVO();
        item.setConfigKey(key);
        item.setConfigValue(value);
        item.setConfigGroup("COMMUNITY");
        item.setConfigType(value instanceof Number ? "NUMBER" : "TEXT");
        item.setHighRisk(highRisk);
        item.setEditable(true);
        return item;
    }

    private CommunityConfigVersionSaveReq.Item configRequestItem(String key, Object value, boolean highRisk) {
        CommunityConfigVersionSaveReq.Item item = new CommunityConfigVersionSaveReq.Item();
        item.setConfigKey(key);
        item.setConfigValue(value);
        item.setConfigGroup("COMMUNITY");
        item.setConfigType(value instanceof Number ? "NUMBER" : "TEXT");
        item.setHighRisk(highRisk);
        item.setEditable(true);
        return item;
    }

    private AppConfig configEntity(String key, String value, String type, int publicVisible) {
        AppConfig item = new AppConfig();
        item.setConfigKey(key);
        item.setConfigValue(value);
        item.setConfigGroup("COMMUNITY");
        item.setConfigType(type);
        item.setPublicVisible(publicVisible);
        item.setStatus("ENABLED");
        return item;
    }

    private CommunityTopicSaveReq topicRequest(String topicName, String coverUrl) {
        CommunityTopicSaveReq req = new CommunityTopicSaveReq();
        req.setTopicName(topicName);
        req.setDescription("发现身边有趣的人和事");
        req.setCoverUrl(coverUrl);
        req.setDisplayScenes(List.of("hot", "topic_list", "publish"));
        req.setRecommended(false);
        req.setSort(10);
        req.setStatus("enabled");
        return req;
    }
}
