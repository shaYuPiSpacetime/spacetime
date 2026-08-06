package com.spacetime.miniapp.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.core.enums.SqlKeyword;
import com.spacetime.common.constant.CommunityConfigKeys;
import com.spacetime.common.community.*;
import com.spacetime.common.config.OssConfig;
import com.spacetime.common.dao.*;
import com.spacetime.common.entity.*;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.miniapp.dto.request.CommunityCommentCreateReq;
import com.spacetime.miniapp.dto.request.CommunityPostCreateReq;
import com.spacetime.miniapp.dto.request.CommunityReportCreateReq;
import com.spacetime.miniapp.dto.response.*;
import com.spacetime.miniapp.service.impl.CommunityServiceImpl;
import com.spacetime.common.service.AppUserAuditContentService;
import com.spacetime.common.service.RelationDomainService;
import com.spacetime.common.util.OssUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PRD-05 CommunityService L3 测试")
class CommunityServiceImplTest {

    @Mock private CommunityPostDao communityPostDao;
    @Mock private CommunityCommentDao communityCommentDao;
    @Mock private CommunityLikeDao communityLikeDao;
    @Mock private CommunityFollowDao communityFollowDao;
    @Mock private CommunityReportDao communityReportDao;
    @Mock private AppConfigDao appConfigDao;
    @Mock private MobileEntryConfigDao mobileEntryConfigDao;
    @Mock private DictDataDao dictDataDao;
    @Mock private AppUserDao appUserDao;
    @Mock private AppUserAuditContentService auditContentService;
    @Mock private AppRelationLikeDao appRelationLikeDao;
    @Mock private RelationDomainService relationDomainService;
    @Mock private com.spacetime.miniapp.service.impl.Prd01AccessEvaluator accessEvaluator;
    @Mock private CommunityExtensionDao communityExtensionDao;
    @Mock private CommunityContentSecurityPort contentSecurityPort;
    @Spy private CommunityAuditPolicy auditPolicy = new CommunityAuditPolicy();
    @Mock private ChatReportContextResolver chatReportContextResolver;
    @Mock private OssConfig ossConfig;
    @Mock private OssUtil ossUtil;
    @Mock private UserUnlockRecordDao userUnlockRecordDao;
    @Mock private StringRedisTemplate redisTemplate;
    @Mock private ValueOperations<String, String> valueOperations;

    @InjectMocks private CommunityServiceImpl communityService;

    private AppUser user;
    private CommunityPost post;
    private SysDictData topic;
    private Map<String, String> runtimeConfigs;

    @BeforeEach
    void setUp() {
        user = new AppUser();
        user.setId(1L);
        user.setNickname("tester");
        user.setLocationCity("330100");

        post = new CommunityPost();
        post.setId(100L);
        post.setAuthorId(2L);
        post.setPostType("community");
        post.setContent("hello");
        post.setTopicId(10L);
        post.setStatus("published");
        post.setAuditStatus("APPROVED");
        post.setLikeCount(0);
        post.setCommentCount(0);
        post.setReportCount(0);
        post.setCreateTime(LocalDateTime.now());

        topic = new SysDictData();
        topic.setId(10L);
        topic.setDictType("community_topic");
        topic.setDictLabel("露营");
        topic.setDictValue("camp");
        topic.setDictSort(1);
        topic.setStatus("ENABLED");
        topic.setRemark("一起分享露营时刻");
        lenient().when(communityExtensionDao.selectTopicById(10L)).thenReturn(formalTopic(topic));

        runtimeConfigs = Map.of(
                CommunityConfigKeys.INTERACTION_GATE_MODE, "LOGIN_ONLY",
                CommunityConfigKeys.POST_MAX_IMAGES, "9",
                CommunityConfigKeys.POST_MAX_TEXT_LENGTH, "500",
                CommunityConfigKeys.POST_MAX_MENTIONS, "5",
                CommunityConfigKeys.SINCERE_POST_MIN_TEXT_LENGTH, "20",
                CommunityConfigKeys.CONTACT_INFO_ALLOWED, "false",
                CommunityConfigKeys.REPORT_ENTRY_ENABLED, "true"
        );
        lenient().when(appConfigDao.selectByKey(anyString())).thenAnswer(invocation ->
                appConfig(invocation.getArgument(0), runtimeConfigs.get(invocation.getArgument(0))));
        lenient().when(appConfigDao.selectPublicEnabled(any())).thenAnswer(invocation -> {
            List<String> keys = invocation.getArgument(0);
            return keys.stream().map(key -> appConfig(key, runtimeConfigs.get(key))).toList();
        });
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
    }

    @Test
    @DisplayName("发布配置缺失-失败关闭")
    void createPost_missingRuntimeConfig_shouldFailClosed() {
        CommunityPostCreateReq req = new CommunityPostCreateReq();
        req.setPostType("community");
        req.setContent("测试动态");
        req.setTopicId(10L);

        when(appUserDao.selectById(1L)).thenReturn(user);
        when(appConfigDao.selectByKey(CommunityConfigKeys.POST_MAX_IMAGES)).thenReturn(null);

        assertThatThrownBy(() -> communityService.createPost(1L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessage("runtime_config_missing");
    }

    @Test
    @DisplayName("发布社区动态-正常")
    void createPost_shouldSucceed() {
        CommunityPostCreateReq req = new CommunityPostCreateReq();
        req.setPostType("community");
        req.setContent("测试动态");
        req.setTopicId(10L);
        req.setImageUrls(List.of("https://static.example.com/miniapp/1/album/a.png"));
        req.setMentionUserIds(List.of(2L));

        when(appUserDao.selectById(1L)).thenReturn(user);
        when(contentSecurityPort.checkPost(any(), any(), any(), any())).thenReturn(CommunitySecurityResult.pass("ok"));
        when(ossUtil.objectExists("miniapp/1/album/a.png")).thenReturn(true);
        when(valueOperations.get("community:upload:ticket:miniapp/1/album/a.png")).thenReturn("1");

        CommunityPublishResultVO result = communityService.createPost(1L, req);

        assertThat(result.getStatus()).isEqualTo("published");
        verify(communityPostDao).insert(argThat(entity ->
                "community_post".equals(entity.getPostType())
                        && "published".equals(entity.getStatus())
                        && "APPROVED".equals(entity.getAuditStatus())));
        verify(redisTemplate).delete("community:upload:ticket:miniapp/1/album/a.png");
    }

    @Test
    @DisplayName("发布同城普通动态-不关联话题也允许提交")
    void createPost_withoutTopic_shouldSucceed() {
        CommunityPostCreateReq req = new CommunityPostCreateReq();
        req.setPostType("community");
        req.setContent("不关联话题的同城动态");
        req.setImageUrls(List.of());

        when(appUserDao.selectById(1L)).thenReturn(user);
        when(contentSecurityPort.checkPost(any(), any(), any(), any()))
                .thenReturn(CommunitySecurityResult.pass("ok"));

        CommunityPublishResultVO result = communityService.createPost(1L, req);

        assertThat(result.getStatus()).isEqualTo("published");
        verify(communityPostDao).insert(argThat(entity -> entity.getTopicId() == null
                && entity.getTopicCode() == null
                && entity.getTopicNameSnapshot() == null));
        verify(communityExtensionDao, never()).selectTopicById(any());
    }

    @Test
    @DisplayName("发布多图动态-超长异步审核追踪码安全持久化")
    void createPost_longMediaTraceCode_shouldPersistSafely() {
        String traceA = "a".repeat(48);
        String traceB = "b".repeat(48);
        String imageA = "https://static.example.com/miniapp/1/album/async-a.png";
        String imageB = "https://static.example.com/miniapp/1/album/async-b.png";
        CommunityPostCreateReq req = new CommunityPostCreateReq();
        req.setPostType("community");
        req.setContent("两张图片异步审核");
        req.setTopicId(10L);
        req.setImageUrls(List.of(imageA, imageB));

        when(appUserDao.selectById(1L)).thenReturn(user);
        when(valueOperations.get(anyString())).thenReturn("1");
        when(ossUtil.objectExists(anyString())).thenReturn(true);
        when(contentSecurityPort.checkPost(any(), any(), any(), any()))
                .thenReturn(CommunitySecurityResult.asyncReview(traceA + "," + traceB));

        CommunityPublishResultVO result = communityService.createPost(1L, req);

        assertThat(result.getStatus()).isEqualTo("pending_manual");
        verify(communityPostDao).insert(argThat(entity -> entity.getMachineCode() != null
                && entity.getMachineCode().length() <= 64));
        verify(communityExtensionDao).insertAudit(argThat(record -> record.getProviderCode() != null
                && record.getProviderCode().length() <= 64));
        verify(communityExtensionDao, times(2)).insertMediaTask(argThat(task ->
                traceA.equals(task.getTraceId()) || traceB.equals(task.getTraceId())));
    }

    @Test
    @DisplayName("发布草稿动态-直传票据过期但本人OSS对象存在时允许提交")
    void createPost_expiredUploadTicketButOwnedObjectExists_shouldSucceed() {
        CommunityPostCreateReq req = new CommunityPostCreateReq();
        req.setPostType("community");
        req.setContent("恢复草稿后发布");
        req.setTopicId(10L);
        req.setImageUrls(List.of("https://static.example.com/miniapp/1/album/expired.png"));

        when(appUserDao.selectById(1L)).thenReturn(user);
        when(contentSecurityPort.checkPost(any(), any(), any(), any())).thenReturn(CommunitySecurityResult.pass("ok"));
        when(ossUtil.objectExists("miniapp/1/album/expired.png")).thenReturn(true);
        when(valueOperations.get("community:upload:ticket:miniapp/1/album/expired.png")).thenReturn(null);

        CommunityPublishResultVO result = communityService.createPost(1L, req);

        assertThat(result.getStatus()).isEqualTo("published");
        verify(communityPostDao).insert(any(CommunityPost.class));
        verify(redisTemplate).delete("community:upload:ticket:miniapp/1/album/expired.png");
    }

    @Test
    @DisplayName("发布含图动态-持久化微信异步审核trace")
    void createPost_asyncMedia_shouldPersistTrace() {
        CommunityPostCreateReq req = new CommunityPostCreateReq();
        req.setPostType("community");
        req.setContent("含图动态");
        req.setTopicId(10L);
        req.setImageUrls(List.of("https://static.example.com/miniapp/1/album/async.png"));
        when(appUserDao.selectById(1L)).thenReturn(user);
        when(valueOperations.get("community:upload:ticket:miniapp/1/album/async.png")).thenReturn("1");
        when(ossUtil.objectExists("miniapp/1/album/async.png")).thenReturn(true);
        when(contentSecurityPort.checkPost(any(), any(), any(), any()))
                .thenReturn(CommunitySecurityResult.asyncReview("trace-1"));

        CommunityPublishResultVO result = communityService.createPost(1L, req);

        assertThat(result.getStatus()).isEqualTo("pending_manual");
        verify(communityExtensionDao).insertMediaTask(argThat(task -> "trace-1".equals(task.getTraceId())
                && "pending".equals(task.getStatus())));
    }

    @Test
    @DisplayName("发布动态-拒绝引用其他用户OSS对象")
    void createPost_otherOwnerImage_shouldReject() {
        CommunityPostCreateReq req = new CommunityPostCreateReq();
        req.setPostType("community");
        req.setContent("测试动态");
        req.setTopicId(10L);
        req.setImageUrls(List.of("https://static.example.com/miniapp/2/album/a.png"));
        when(appUserDao.selectById(1L)).thenReturn(user);

        assertThatThrownBy(() -> communityService.createPost(1L, req))
                .isInstanceOf(BusinessException.class).hasMessage("image_not_owned");
        verify(ossUtil, never()).objectExists(anyString());
        verifyNoInteractions(contentSecurityPort);
    }

    @Test
    @DisplayName("发布动态-本人对象未完成上传时拒绝")
    void createPost_missingObject_shouldReject() {
        CommunityPostCreateReq req = new CommunityPostCreateReq();
        req.setPostType("community");
        req.setContent("测试动态");
        req.setTopicId(10L);
        req.setImageUrls(List.of("https://static.example.com/miniapp/1/album/missing.png"));
        when(appUserDao.selectById(1L)).thenReturn(user);
        when(valueOperations.get("community:upload:ticket:miniapp/1/album/missing.png")).thenReturn("1");
        when(ossUtil.objectExists("miniapp/1/album/missing.png")).thenReturn(false);

        assertThatThrownBy(() -> communityService.createPost(1L, req))
                .isInstanceOf(BusinessException.class).hasMessage("image_upload_invalid");
        verifyNoInteractions(contentSecurityPort);
    }

    @Test
    @DisplayName("发布诚意贴-机审通过后进入人工审核")
    void createSincerePost_machinePass_shouldPendingManual() {
        CommunityPostCreateReq req = new CommunityPostCreateReq();
        req.setPostType("sincere_post");
        req.setTitle("真诚交友");
        req.setContent("太短");
        req.setTopicId(10L);

        when(appUserDao.selectById(1L)).thenReturn(user);
        when(contentSecurityPort.checkPost(any(), any(), any(), any())).thenReturn(CommunitySecurityResult.pass("ok"));

        CommunityPublishResultVO result = communityService.createPost(1L, req);

        assertThat(result.getStatus()).isEqualTo("pending_manual");
        verify(communityPostDao).insert(argThat(entity -> "pending_manual".equals(entity.getStatus())));
    }

    @Test
    @DisplayName("点赞动态-首次点击")
    void toggleLike_firstTime_shouldLike() {
        when(appUserDao.selectById(1L)).thenReturn(user);
        when(communityPostDao.selectById(100L)).thenReturn(post);
        when(communityLikeDao.selectOne(any())).thenReturn(null);

        CommunityLikeToggleVO result = communityService.toggleLike(1L, 100L);

        assertThat(result.getLiked()).isTrue();
        assertThat(result.getLikeCount()).isEqualTo(1);
        verify(communityLikeDao).insert(any());
    }

    @Test
    @DisplayName("关注用户-再次点击取消")
    void toggleFollow_secondTime_shouldUnfollow() {
        CommunityFollow follow = new CommunityFollow();
        follow.setId(1L);
        follow.setFollowerId(1L);
        follow.setTargetUserId(2L);
        follow.setStatus("FOLLOW");

        when(appUserDao.selectById(1L)).thenReturn(user);
        when(appUserDao.selectById(2L)).thenReturn(new AppUser());
        when(communityFollowDao.selectOne(any())).thenReturn(follow);

        CommunityFollowToggleVO result = communityService.toggleFollow(1L, 2L);

        assertThat(result.getFollowing()).isFalse();
        verify(communityFollowDao).updateById(argThat(item -> "UNFOLLOW".equals(item.getStatus())));
    }

    @Test
    @DisplayName("发表评论-正常")
    void createComment_shouldSucceed() {
        CommunityCommentCreateReq req = new CommunityCommentCreateReq();
        req.setPostId(100L);
        req.setContent("nice");

        when(appUserDao.selectById(1L)).thenReturn(user);
        when(communityPostDao.selectById(100L)).thenReturn(post);

        when(contentSecurityPort.checkText(any(), any(), any())).thenReturn(CommunitySecurityResult.pass("ok"));

        CommunityCommentResultVO result = communityService.createComment(1L, req);

        assertThat(result.getStatus()).isEqualTo("published");
        verify(communityCommentDao).insert(any());
        verify(communityPostDao).updateById(argThat(item -> item.getCommentCount() == 1));
    }

    @Test
    @DisplayName("提交举报-动态目标")
    void createReport_shouldSucceed() {
        CommunityReportCreateReq req = new CommunityReportCreateReq();
        req.setTargetType("post");
        req.setTargetId("100");
        req.setReasonCode("spam");

        SysDictData reason = new SysDictData();
        reason.setDictType("community_report_reason");
        reason.setDictValue("spam");
        when(dictDataDao.selectByDictType("community_report_reason")).thenReturn(List.of(reason));
        when(communityPostDao.selectById(100L)).thenReturn(post);

        when(appUserDao.selectById(1L)).thenReturn(user);

        CommunityReportResultVO result = communityService.createReport(1L, req);

        assertThat(result.getStatus()).isEqualTo("pending");
        verify(communityReportDao).insert(any());
        verify(communityPostDao).updateById(argThat(item -> item.getReportCount() == 1));
    }

    @Test
    @DisplayName("关注信息流-没有关注关系返回空页")
    void getPosts_followingWithoutRelations_shouldReturnEmptyPage() {
        when(communityFollowDao.selectList(any())).thenReturn(List.of());

        var result = communityService.getPosts(1L, null, null, "FOLLOWING", 1, 10);

        assertThat(result.getTotal()).isZero();
        assertThat(result.getRecords()).isEmpty();
        verifyNoInteractions(communityPostDao);
    }

    @Test
    @DisplayName("悦目列表-返回审核通过的用户照片与心动态")
    void getYuemuUsers_shouldReturnPublicPhotoCards() {
        user.setMajor("软件工程");
        AppUser candidate = new AppUser();
        candidate.setId(2L);
        candidate.setNickname("知音用户");
        candidate.setMajor("软件工程");
        candidate.setEducationLevel("MASTER");
        candidate.setSchool("南京大学");
        candidate.setLastLoginTime(LocalDateTime.now().minusHours(2));

        Page<AppUser> userPage = new Page<>(1, 20, 1);
        userPage.setRecords(List.of(candidate));
        AppRelationLike liked = new AppRelationLike();
        liked.setToUserId(2L);

        when(appUserDao.selectById(1L)).thenReturn(user);
        when(appUserDao.selectPage(any(), any())).thenReturn(userPage);
        when(auditContentService.publicAlbumPhotos(anyCollection())).thenReturn(Map.of(2L, List.of("photo.png")));
        when(auditContentService.publicAvatars(anyCollection())).thenReturn(Map.of());
        when(appRelationLikeDao.selectList(any())).thenReturn(List.of(liked));
        AppConfig fateCopy = new AppConfig();
        fateCopy.setConfigValue("同专业，超有缘");
        when(appConfigDao.selectByKey("community.copy.fate_same_major")).thenReturn(fateCopy);
        AppConfig educationCopy = new AppConfig();
        educationCopy.setConfigValue("硕士");
        when(appConfigDao.selectByKey("community.copy.education_master")).thenReturn(educationCopy);

        var result = communityService.getYuemuUsers(1L, 1, 20);

        assertThat(result.getRecords()).hasSize(1);
        assertThat(result.getRecords().get(0).getPhotoUrl()).isEqualTo("photo.png");
        assertThat(result.getRecords().get(0).getFateLabel()).isEqualTo("同专业，超有缘");
        assertThat(result.getRecords().get(0).getEducationSchool()).isEqualTo("硕士·南京大学");
        assertThat(result.getRecords().get(0).getLiked()).isTrue();
    }

    @Test
    @DisplayName("悦目心动-首次点击创建喜欢关系")
    void toggleYuemuLike_firstTime_shouldCreateLike() {
        AppUser target = new AppUser();
        target.setId(2L);
        target.setAccountStatus("NORMAL");
        when(appUserDao.selectById(1L)).thenReturn(user);
        when(appUserDao.selectById(2L)).thenReturn(target);
        when(appRelationLikeDao.selectOne(any())).thenReturn(null);

        YuemuLikeToggleVO result = communityService.toggleYuemuLike(1L, 2L);

        assertThat(result.getLiked()).isTrue();
        verify(relationDomainService).createLike(anyString(), eq(1L), eq(2L), eq("yuemu"), any(LocalDateTime.class));
    }

    @Test
    @DisplayName("同城信息流-使用当前用户资料城市筛选作者")
    void getPosts_city_shouldResolveAuthorsFromAppUser() {
        AppUser sameCity = new AppUser();
        sameCity.setId(2L);
        sameCity.setLocationCity("330100");
        when(appUserDao.selectById(1L)).thenReturn(user);
        when(appUserDao.selectList(any())).thenReturn(List.of(sameCity));
        when(communityPostDao.selectPage(any(), any())).thenReturn(new com.baomidou.mybatisplus.extension.plugins.pagination.Page<>(1, 10, 0));

        communityService.getPosts(1L, null, null, "CITY", 1, 10);

        verify(appUserDao).selectList(any());
        verify(communityPostDao).selectPage(any(), any());
    }

    @Test
    @DisplayName("我的动态-查询层排除已删除和已屏蔽内容")
    void getUserPosts_mine_shouldExcludeDeletedAndBlocked() {
        when(appUserDao.selectById(1L)).thenReturn(user);
        when(communityPostDao.selectPage(any(), any())).thenReturn(new Page<>(1, 10, 0));

        communityService.getUserPosts(1L, "1", true, 1, 10);

        verify(communityPostDao).selectPage(any(), argThat(wrapper ->
                wrapper.getExpression().getNormal().stream().anyMatch(segment -> segment == SqlKeyword.NOT_IN)));
    }

    @Test
    @DisplayName("热门话题聚合-返回主话题与关联话题")
    void getTopicHome_shouldReturnFeaturedAndRelatedTopics() {
        SysDictData related = topic(11L, "新人报道", 2, "分享初来社区的第一印象");
        CommunityPost featuredPost = post(100L, 10L, 2L, "我们官宣啦", 20, 8,
                LocalDateTime.now().minusHours(2));
        CommunityPost relatedPost = post(101L, 11L, 3L, "新人报道", 8, 2,
                LocalDateTime.now().minusHours(1));

        when(communityExtensionDao.selectTopics(any())).thenReturn(List.of(formalTopic(topic), formalTopic(related)));
        when(communityPostDao.selectList(any())).thenReturn(List.of(featuredPost, relatedPost));
        when(appUserDao.selectById(2L)).thenReturn(author(2L, "筱老虎"));
        when(appUserDao.selectById(3L)).thenReturn(author(3L, "mini"));
        when(auditContentService.publicAvatar(2L)).thenReturn("avatar-2.png");
        when(auditContentService.publicAvatar(3L)).thenReturn("avatar-3.png");

        var result = communityService.getTopicHome(null);

        assertThat(result.getFeatured().getId()).isEqualTo(10L);
        assertThat(result.getFeatured().getPreviewContent()).isEqualTo("我们官宣啦");
        assertThat(result.getFeatured().getPostCount()).isEqualTo(1L);
        assertThat(result.getRelated()).extracting("id").containsExactly(11L);
    }

    @Test
    @DisplayName("热门话题只展示封面审核通过且配置热门场景的话题")
    void getTopicHome_shouldFilterByCoverAuditAndDisplayScene() {
        CommunityTopic hot = formalTopic(topic);
        CommunityTopic publishOnly = formalTopic(topic(11L, "仅发布可选", 2, "发布页话题"));
        publishOnly.setDisplayScenes("[\"publish\"]");
        CommunityTopic pendingCover = formalTopic(topic(12L, "封面待审", 3, "待审核封面"));
        pendingCover.setCoverAuditStatus("pending_machine");
        when(communityExtensionDao.selectTopics(any())).thenReturn(List.of(hot, publishOnly, pendingCover));
        when(communityPostDao.selectList(any())).thenReturn(List.of());

        var result = communityService.getTopicHome(null);

        assertThat(result.getFeatured().getId()).isEqualTo(10L);
        assertThat(result.getRelated()).isEmpty();
    }

    @Test
    @DisplayName("话题详情-统计动态数和参与人数")
    void getTopicDetail_shouldCountPostsAndParticipants() {
        CommunityPost first = post(100L, 10L, 2L, "第一条", 3, 1,
                LocalDateTime.now().minusDays(1));
        CommunityPost second = post(101L, 10L, 3L, "第二条", 4, 2,
                LocalDateTime.now());
        CommunityPost third = post(102L, 10L, 2L, "第三条", 5, 3,
                LocalDateTime.now().minusHours(2));
        when(communityPostDao.selectList(any())).thenReturn(List.of(first, second, third));

        var result = communityService.getTopicDetail(10L);

        assertThat(result.getPostCount()).isEqualTo(3L);
        assertThat(result.getParticipantCount()).isEqualTo(2L);
        assertThat(result.getName()).isEqualTo("露营");
    }

    @Test
    @DisplayName("话题动态-热门和最新排序交给服务端")
    void getTopicPosts_shouldUseRequestedSort() {
        Page<CommunityPost> page = new Page<>(1, 10, 0);
        page.setRecords(List.of());
        when(communityPostDao.selectPage(any(), any())).thenReturn(page);

        communityService.getTopicPosts(null, 10L, "HOT", 1, 10);
        communityService.getTopicPosts(null, 10L, "LATEST", 1, 10);

        verify(communityPostDao, times(2)).selectPage(any(), any());
    }

    @Test
    @DisplayName("社区Meta-话题唯一读取独立话题表")
    void getMeta_shouldExposeFormalTopicsWithoutRuntimeDictionaryFallback() {
        CommunityTopic formal = formalTopic(topic);
        when(communityExtensionDao.selectTopics(any())).thenReturn(List.of(formal));
        when(dictDataDao.selectByDictType(anyString())).thenReturn(List.of());

        CommunityMetaVO result = communityService.getMeta();

        assertThat(result.getDictionaries().get("topics")).isNotNull();
        assertThat(result.getDictionaries().get("topics")).hasSize(1);
        verify(dictDataDao, never()).selectByDictType("community_topic");
    }

    private SysDictData topic(Long id, String label, int sort, String remark) {
        SysDictData value = new SysDictData();
        value.setId(id);
        value.setDictType("community_topic");
        value.setDictLabel(label);
        value.setDictValue(String.valueOf(id));
        value.setDictSort(sort);
        value.setStatus("ENABLED");
        value.setRemark(remark);
        return value;
    }

    private AppConfig appConfig(String key, String value) {
        if (value == null) return null;
        AppConfig config = new AppConfig();
        config.setConfigKey(key);
        config.setConfigValue(value);
        config.setStatus("ENABLED");
        return config;
    }

    private CommunityPost post(Long id, Long topicId, Long authorId, String content,
                               int likeCount, int commentCount, LocalDateTime createTime) {
        CommunityPost value = new CommunityPost();
        value.setId(id);
        value.setTopicId(topicId);
        value.setAuthorId(authorId);
        value.setPostType("community");
        value.setContent(content);
        value.setImageUrls("[]");
        value.setStatus("published");
        value.setAuditStatus("APPROVED");
        value.setLikeCount(likeCount);
        value.setCommentCount(commentCount);
        value.setReportCount(0);
        value.setCreateTime(createTime);
        return value;
    }

    private AppUser author(Long id, String nickname) {
        AppUser value = new AppUser();
        value.setId(id);
        value.setNickname(nickname);
        return value;
    }

    private CommunityTopic formalTopic(SysDictData source) {
        CommunityTopic value = new CommunityTopic();
        value.setId(source.getId());
        value.setTopicCode(source.getDictValue());
        value.setTopicName(source.getDictLabel());
        value.setDescription(source.getRemark());
        value.setSort(source.getDictSort());
        value.setRecommended(source.getDictSort() != null && source.getDictSort() == 1 ? 1 : 0);
        value.setStatus("enabled");
        value.setCoverAuditStatus("approved");
        value.setDisplayScenes("[\"hot\",\"topic_list\",\"publish\"]");
        value.setVersion(0);
        return value;
    }
}
