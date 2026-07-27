package com.spacetime.miniapp.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.constant.CommunityConfigKeys;
import com.spacetime.common.dao.*;
import com.spacetime.common.entity.*;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.miniapp.dto.request.CommunityCommentCreateReq;
import com.spacetime.miniapp.dto.request.CommunityPostCreateReq;
import com.spacetime.miniapp.dto.request.CommunityReportCreateReq;
import com.spacetime.miniapp.dto.response.CommunityFollowToggleVO;
import com.spacetime.miniapp.dto.response.CommunityLikeToggleVO;
import com.spacetime.miniapp.dto.response.YuemuLikeToggleVO;
import com.spacetime.miniapp.service.impl.CommunityServiceImpl;
import com.spacetime.common.service.AppUserAuditContentService;
import com.spacetime.common.service.RelationDomainService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

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

    @InjectMocks private CommunityServiceImpl communityService;

    private AppUser user;
    private CommunityPost post;
    private SysDictData topic;
    private AppConfig loginOnlyConfig;

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
        post.setStatus("PUBLISHED");
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

        loginOnlyConfig = new AppConfig();
        loginOnlyConfig.setConfigKey(CommunityConfigKeys.INTERACTION_GATE_MODE);
        loginOnlyConfig.setConfigValue("LOGIN_ONLY");
    }

    @Test
    @DisplayName("发布社区动态-正常")
    void createPost_shouldSucceed() {
        CommunityPostCreateReq req = new CommunityPostCreateReq();
        req.setPostType("community");
        req.setContent("测试动态");
        req.setTopicId(10L);
        req.setImageUrls(List.of("a.png"));
        req.setMentionUserIds(List.of(2L));

        when(appUserDao.selectById(1L)).thenReturn(user);
        when(dictDataDao.selectById(10L)).thenReturn(topic);
        when(appConfigDao.selectByKey(CommunityConfigKeys.INTERACTION_GATE_MODE)).thenReturn(loginOnlyConfig);
        when(appConfigDao.selectByKey(CommunityConfigKeys.POST_MAX_IMAGES)).thenReturn(null);
        when(appConfigDao.selectByKey(CommunityConfigKeys.POST_MAX_TEXT_LENGTH)).thenReturn(null);
        when(appConfigDao.selectByKey(CommunityConfigKeys.POST_MAX_MENTIONS)).thenReturn(null);

        Long result = communityService.createPost(1L, req);

        assertThat(result).isNull();
        verify(communityPostDao).insert(argThat(entity ->
                "community".equals(entity.getPostType())
                        && "PENDING".equals(entity.getStatus())
                        && "PENDING".equals(entity.getAuditStatus())));
    }

    @Test
    @DisplayName("发布诚意贴-正文长度不足")
    void createSincerePost_tooShort_shouldThrow() {
        CommunityPostCreateReq req = new CommunityPostCreateReq();
        req.setPostType("sincere_post");
        req.setTitle("真诚交友");
        req.setContent("太短");
        req.setTopicId(10L);

        when(appUserDao.selectById(1L)).thenReturn(user);
        when(dictDataDao.selectById(10L)).thenReturn(topic);
        when(appConfigDao.selectByKey(CommunityConfigKeys.INTERACTION_GATE_MODE)).thenReturn(loginOnlyConfig);
        AppConfig minConfig = new AppConfig();
        minConfig.setConfigValue("20");
        when(appConfigDao.selectByKey(CommunityConfigKeys.SINCERE_POST_MIN_TEXT_LENGTH)).thenReturn(minConfig);
        when(appConfigDao.selectByKey(CommunityConfigKeys.POST_MAX_IMAGES)).thenReturn(null);
        when(appConfigDao.selectByKey(CommunityConfigKeys.POST_MAX_TEXT_LENGTH)).thenReturn(null);
        when(appConfigDao.selectByKey(CommunityConfigKeys.POST_MAX_MENTIONS)).thenReturn(null);

        assertThatThrownBy(() -> communityService.createPost(1L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("不能少于");
    }

    @Test
    @DisplayName("点赞动态-首次点击")
    void toggleLike_firstTime_shouldLike() {
        when(appUserDao.selectById(1L)).thenReturn(user);
        when(appConfigDao.selectByKey(CommunityConfigKeys.INTERACTION_GATE_MODE)).thenReturn(loginOnlyConfig);
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
        when(appConfigDao.selectByKey(CommunityConfigKeys.INTERACTION_GATE_MODE)).thenReturn(loginOnlyConfig);
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
        when(appConfigDao.selectByKey(CommunityConfigKeys.INTERACTION_GATE_MODE)).thenReturn(loginOnlyConfig);
        when(communityPostDao.selectById(100L)).thenReturn(post);

        Long result = communityService.createComment(1L, req);

        assertThat(result).isNull();
        verify(communityCommentDao).insert(any());
        verify(communityPostDao).updateById(argThat(item -> item.getCommentCount() == 1));
    }

    @Test
    @DisplayName("提交举报-动态目标")
    void createReport_shouldSucceed() {
        CommunityReportCreateReq req = new CommunityReportCreateReq();
        req.setTargetType("post");
        req.setTargetId(100L);
        req.setReasonCode("spam");

        SysDictData reason = new SysDictData();
        reason.setDictType("community_report_reason");
        reason.setDictValue("spam");
        when(dictDataDao.selectByDictType("community_report_reason")).thenReturn(List.of(reason));
        when(communityPostDao.selectById(100L)).thenReturn(post);

        Long result = communityService.createReport(1L, req);

        assertThat(result).isNull();
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
        when(appConfigDao.selectByKey(CommunityConfigKeys.INTERACTION_GATE_MODE)).thenReturn(loginOnlyConfig);
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
    @DisplayName("热门话题聚合-返回主话题与关联话题")
    void getTopicHome_shouldReturnFeaturedAndRelatedTopics() {
        SysDictData related = topic(11L, "新人报道", 2, "分享初来社区的第一印象");
        CommunityPost featuredPost = post(100L, 10L, 2L, "我们官宣啦", 20, 8,
                LocalDateTime.now().minusHours(2));
        CommunityPost relatedPost = post(101L, 11L, 3L, "新人报道", 8, 2,
                LocalDateTime.now().minusHours(1));

        when(dictDataDao.selectByDictType("community_topic")).thenReturn(List.of(topic, related));
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
    @DisplayName("话题详情-统计动态数和参与人数")
    void getTopicDetail_shouldCountPostsAndParticipants() {
        CommunityPost first = post(100L, 10L, 2L, "第一条", 3, 1,
                LocalDateTime.now().minusDays(1));
        CommunityPost second = post(101L, 10L, 3L, "第二条", 4, 2,
                LocalDateTime.now());
        CommunityPost third = post(102L, 10L, 2L, "第三条", 5, 3,
                LocalDateTime.now().minusHours(2));
        when(dictDataDao.selectById(10L)).thenReturn(topic);
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
        when(dictDataDao.selectById(10L)).thenReturn(topic);
        when(communityPostDao.selectPage(any(), any())).thenReturn(page);

        communityService.getTopicPosts(null, 10L, "HOT", 1, 10);
        communityService.getTopicPosts(null, 10L, "LATEST", 1, 10);

        verify(communityPostDao, times(2)).selectPage(any(), any());
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

    private CommunityPost post(Long id, Long topicId, Long authorId, String content,
                               int likeCount, int commentCount, LocalDateTime createTime) {
        CommunityPost value = new CommunityPost();
        value.setId(id);
        value.setTopicId(topicId);
        value.setAuthorId(authorId);
        value.setPostType("community");
        value.setContent(content);
        value.setImageUrls("[]");
        value.setStatus("PUBLISHED");
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
}
