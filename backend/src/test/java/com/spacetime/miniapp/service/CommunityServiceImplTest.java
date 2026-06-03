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
import com.spacetime.miniapp.service.impl.CommunityServiceImpl;
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
import static org.mockito.ArgumentMatchers.argThat;
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
    @Mock private UserDao userDao;

    @InjectMocks private CommunityServiceImpl communityService;

    private SysUser user;
    private CommunityPost post;
    private SysDictData topic;
    private AppConfig loginOnlyConfig;

    @BeforeEach
    void setUp() {
        user = new SysUser();
        user.setId(1L);
        user.setNickname("tester");
        user.setPhone("13812345678");
        user.setAvatar("avatar");

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

        when(userDao.selectById(1L)).thenReturn(user);
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

        when(userDao.selectById(1L)).thenReturn(user);
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
        when(userDao.selectById(1L)).thenReturn(user);
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

        when(userDao.selectById(1L)).thenReturn(user);
        when(userDao.selectById(2L)).thenReturn(new SysUser());
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

        when(userDao.selectById(1L)).thenReturn(user);
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
}
