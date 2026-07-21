package com.spacetime.miniapp.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserRelationBlockDao;
import com.spacetime.common.dao.AppUserSearchLogDao;
import com.spacetime.common.dao.CommunityPostDao;
import com.spacetime.common.dao.DictDataDao;
import com.spacetime.common.dao.SearchBlockWordDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.CommunityPost;
import com.spacetime.common.entity.SearchBlockWord;
import com.spacetime.common.entity.SysDictData;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.AppUserAuditContentService;
import com.spacetime.miniapp.dto.response.MiniappSearchResultPageVO;
import com.spacetime.miniapp.service.impl.MiniappSearchResultServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("PRD-06 小程序入口限定搜索测试")
class MiniappSearchResultServiceImplTest {

    @Mock private SearchBlockWordDao searchBlockWordDao;
    @Mock private AppUserSearchLogDao searchLogDao;
    @Mock private AppUserRelationBlockDao relationBlockDao;
    @Mock private AppUserDao appUserDao;
    @Mock private CommunityPostDao communityPostDao;
    @Mock private DictDataDao dictDataDao;
    @Mock private AppUserAuditContentService auditContentService;

    private MiniappSearchResultServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new MiniappSearchResultServiceImpl(
                searchBlockWordDao,
                searchLogDao,
                relationBlockDao,
                appUserDao,
                communityPostDao,
                dictDataDao,
                auditContentService);
        lenient().when(searchBlockWordDao.selectEnabledList()).thenReturn(List.of());
    }

    @Test
    @DisplayName("全局场景返回用户、动态、话题三个固定 Tab 并使用 AppUser 查询")
    void search_globalUser_shouldUseAppUserAndReturnScopedTabs() {
        AppUser user = new AppUser();
        user.setId(88L);
        user.setNickname("阳光考拉");
        user.setLocationCity("杭州市");
        user.setAccountStatus("NORMAL");
        Page<AppUser> page = new Page<>(1, 20, 1);
        page.setRecords(List.of(user));
        when(appUserDao.selectPage(any(), any())).thenReturn(page);
        when(relationBlockDao.selectActiveByUserId(1L, "BLACKLIST")).thenReturn(List.of());
        when(auditContentService.publicAvatars(List.of(88L))).thenReturn(Map.of(88L, "avatar.png"));

        MiniappSearchResultPageVO result = service.search(1L, "考拉", "user", "global", 1, 20);

        assertThat(result.getSourceScene()).isEqualTo("global");
        assertThat(result.getTabs()).containsExactly("user", "post", "topic");
        assertThat(result.getItems()).singleElement().satisfies(item -> {
            assertThat(item.getTitle()).isEqualTo("阳光考拉");
            assertThat(item.getSubtitle()).contains("成家号 88").contains("杭州市");
            assertThat(item.getAvatar()).isEqualTo("avatar.png");
        });
        verify(searchLogDao).insert(org.mockito.ArgumentMatchers.argThat(log ->
                "global".equals(log.getSourceScene()) && log.getViolation() == 0));
    }

    @Test
    @DisplayName("社区场景只允许动态和话题")
    void search_community_shouldRejectUserType() {
        assertThatThrownBy(() -> service.search(1L, "露营", "user", "community", 1, 20))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("来源场景");

        verify(appUserDao, never()).selectPage(any(), any());
    }

    @Test
    @DisplayName("推荐场景只查询用户")
    void search_recommend_shouldOnlyExposeUserTab() {
        Page<AppUser> page = new Page<>(1, 20, 0);
        page.setRecords(List.of());
        when(appUserDao.selectPage(any(), any())).thenReturn(page);
        when(relationBlockDao.selectActiveByUserId(1L, "BLACKLIST")).thenReturn(List.of());

        MiniappSearchResultPageVO result = service.search(1L, "杭州", "user", "recommend", 1, 20);

        assertThat(result.getTabs()).containsExactly("user");
        assertThat(result.getItems()).isEmpty();
        verify(communityPostDao, never()).selectPage(any(), any());
    }

    @Test
    @DisplayName("命中违规词时阻断查询并记录来源场景")
    void search_violation_shouldBlockBeforeQuery() {
        SearchBlockWord blockWord = new SearchBlockWord();
        blockWord.setWord("约炮");
        blockWord.setBlockType("SEARCH_VIOLATION");
        blockWord.setMatchType("EXACT");
        blockWord.setHitMessage("搜索内容不支持展示");
        when(searchBlockWordDao.selectEnabledList()).thenReturn(List.of(blockWord));

        MiniappSearchResultPageVO result = service.search(1L, "约炮", "post", "community", 1, 20);

        assertThat(result.getViolation()).isTrue();
        assertThat(result.getMessage()).isEqualTo("搜索内容不支持展示");
        assertThat(result.getTabs()).containsExactly("post", "topic");
        verify(communityPostDao, never()).selectPage(any(), any());
        verify(searchLogDao).insert(org.mockito.ArgumentMatchers.argThat(log ->
                "community".equals(log.getSourceScene()) && log.getViolation() == 1));
    }

    @Test
    @DisplayName("动态和话题结果命中结果屏蔽词时不展示")
    void search_postAndTopic_shouldFilterBlockedResults() {
        SearchBlockWord blockWord = new SearchBlockWord();
        blockWord.setWord("联系方式");
        blockWord.setBlockType("RESULT_BLOCK");
        blockWord.setMatchType("FUZZY");
        when(searchBlockWordDao.selectEnabledList()).thenReturn(List.of(blockWord));

        CommunityPost blockedPost = new CommunityPost();
        blockedPost.setId(1L);
        blockedPost.setTitle("交换联系方式");
        blockedPost.setContent("加微信");
        Page<CommunityPost> page = new Page<>(1, 20, 1);
        page.setRecords(List.of(blockedPost));
        when(communityPostDao.selectPage(any(), any())).thenReturn(page);

        MiniappSearchResultPageVO postResult = service.search(1L, "联系", "post", "community", 1, 20);
        assertThat(postResult.getItems()).isEmpty();

        SysDictData blockedTopic = new SysDictData();
        blockedTopic.setId(2L);
        blockedTopic.setDictLabel("联系方式交换");
        blockedTopic.setRemark("请注意隐私");
        when(dictDataDao.selectList(any())).thenReturn(List.of(blockedTopic));

        MiniappSearchResultPageVO topicResult = service.search(1L, "联系", "topic", "community", 1, 20);
        assertThat(topicResult.getItems()).isEmpty();
    }
}
