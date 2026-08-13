package com.spacetime.miniapp.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.AppRelationLikeDao;
import com.spacetime.common.dao.AppRelationLikeInboxStateDao;
import com.spacetime.common.dao.AppRelationMatchDao;
import com.spacetime.common.dao.AppRelationMatchPopupDao;
import com.spacetime.common.dao.AppRelationMatchSourceDao;
import com.spacetime.common.dao.AppRelationVisitDao;
import com.spacetime.common.dao.AppRelationVisitEventDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.UserAssetDao;
import com.spacetime.common.dao.UserUnlockRecordDao;
import com.spacetime.common.constant.ProfileDictType;
import com.spacetime.common.dto.RelationLikeListRow;
import com.spacetime.common.dto.RelationVisitListRow;
import com.spacetime.common.dto.RelationVisitStats;
import com.spacetime.common.entity.AppRelationLike;
import com.spacetime.common.entity.AppRelationMatch;
import com.spacetime.common.entity.AppRelationVisit;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.UserAsset;
import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.common.enums.GenderEnum;
import com.spacetime.common.service.AppUserAuditContentService;
import com.spacetime.common.service.MiniappPresenceService;
import com.spacetime.common.service.ProfileDictionaryService;
import com.spacetime.common.service.RelationAccessProjectionService;
import com.spacetime.common.service.RelationDomainService;
import com.spacetime.miniapp.dto.response.LikesMePageVO;
import com.spacetime.miniapp.dto.response.LikesMeSummaryVO;
import com.spacetime.miniapp.dto.response.MutualMatchPageVO;
import com.spacetime.miniapp.dto.response.RecentViewersPageVO;
import com.spacetime.miniapp.dto.response.RelationLikeActionVO;
import com.spacetime.miniapp.service.impl.MiniappRelationServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** PRD-02 移动端列表展示与字段契约。 */
@ExtendWith(MockitoExtension.class)
class MiniappRelationServiceImplTest {
    @Mock private AppUserDao appUserDao;
    @Mock private AppRelationLikeDao likeDao;
    @Mock private AppRelationLikeInboxStateDao likeInboxStateDao;
    @Mock private AppRelationVisitDao visitDao;
    @Mock private AppRelationVisitEventDao visitEventDao;
    @Mock private AppRelationMatchDao matchDao;
    @Mock private AppRelationMatchSourceDao matchSourceDao;
    @Mock private AppRelationMatchPopupDao matchPopupDao;
    @Mock private UserAssetDao userAssetDao;
    @Mock private UserUnlockRecordDao unlockRecordDao;
    @Mock private RelationDomainService relationDomainService;
    @Mock private RelationAccessProjectionService accessProjectionService;
    @Mock private AppUserAuditContentService auditContentService;
    @Mock private ProfileDictionaryService profileDictionaryService;
    @Mock private MiniappPresenceService presenceService;

    @InjectMocks private MiniappRelationServiceImpl service;

    @Test
    void likesMeSummaryUsesSameEffectiveRelationsReadCursorAndUnlockDisplay() {
        AppUser current = activeUser(7L, "当前用户", GenderEnum.MALE.getCode());
        AppRelationLike like = incomingLike(8L, 7L, "LIK-001");
        RelationLikeListRow latest = likeRow(like);

        when(appUserDao.selectById(7L)).thenReturn(current);
        when(accessProjectionService.project(current)).thenReturn("OPEN");
        when(likeDao.selectLatestIncomingLike(7L)).thenReturn(latest);
        when(likeDao.selectOne(any())).thenReturn(like);
        when(likeDao.count(any())).thenReturn(12L, 3L);
        when(userAssetDao.selectByUserId(7L)).thenReturn(inactiveAsset(7L));
        when(auditContentService.publicAvatar(8L)).thenReturn("https://cdn.test/8.jpg");

        LikesMeSummaryVO result = service.likesMeSummary(7L);

        assertThat(result.getTotalCount()).isEqualTo(12L);
        assertThat(result.getNewCount()).isEqualTo(3L);
        assertThat(result.getLatestAvatarUrl()).isEqualTo("https://cdn.test/8.jpg");
        assertThat(result.getLatestLikedTime()).isEqualTo(like.getLikedTime());
        assertThat(result.getLatestDisplayStatus()).isEqualTo("blur");
    }

    @Test
    void ordinaryLikesListReturnsTrueTotalAndCompleteProfileWithBlurDisplayStatus() {
        AppUser current = activeUser(7L, "当前用户", GenderEnum.MALE.getCode());
        current.setLocationCity("杭州");
        AppUser target = activeUser(8L, "真实昵称", GenderEnum.FEMALE.getCode());
        target.setLocationCity("杭州");
        target.setSchool("浙江大学");
        target.setAge(25);
        AppRelationLike like = incomingLike(8L, 7L, "LIK-001");
        RelationLikeListRow row = likeRow(like);

        when(appUserDao.selectById(7L)).thenReturn(current);
        when(accessProjectionService.project(current)).thenReturn("OPEN");
        when(userAssetDao.selectByUserId(7L)).thenReturn(inactiveAsset(7L));
        when(likeDao.selectOne(any())).thenReturn(like);
        when(likeDao.count(any())).thenReturn(12L, 12L);
        when(likeDao.countVisibleIncomingLikes(eq(7L), eq(false), any(), any())).thenReturn(10L);
        when(likeDao.selectVisibleIncomingLikes(eq(7L), eq(false), any(), any(), any(), any(),
                any(Long.class), any(Integer.class))).thenReturn(List.of(row));
        when(likeDao.selectNewIncomingLikePreviews(eq(7L), any(), any(), any(), any(), eq(5)))
                .thenReturn(List.of(row));
        when(appUserDao.selectList(any())).thenReturn(List.of(target));
        when(matchDao.selectActiveByUser(7L)).thenReturn(List.of());
        when(auditContentService.publicAvatars(List.of(8L)))
                .thenReturn(Map.of(8L, "https://cdn.test/8.jpg"));

        LikesMePageVO result = service.likesMe(7L, 1, 10);

        assertThat(result.getTotal()).isEqualTo(12);
        assertThat(result.getVisibleTotal()).isEqualTo(10);
        assertThat(result.getHiddenCount()).isEqualTo(2);
        assertThat(result.getAccessMode()).isEqualTo("BLUR_LIMIT");
        assertThat(result.getHasMore()).isFalse();
        assertThat(result.getRecords()).singleElement().satisfies(item -> {
            assertThat(item.getDisplayStatus()).isEqualTo("blur");
            assertThat(item.getUserId()).isEqualTo(8L);
            assertThat(item.getAvatar()).isEqualTo("https://cdn.test/8.jpg");
            assertThat(item.getNickname()).isEqualTo("真实昵称");
            assertThat(item.getAge()).isEqualTo(25);
            assertThat(item.getSchool()).isEqualTo("浙江大学");
            assertThat(item.getWeakTags()).contains("同城");
        });
    }

    @Test
    void activeVipGetsClearIdentityAndTwentyRowPaging() {
        AppUser current = activeUser(7L, "当前用户", GenderEnum.MALE.getCode());
        AppUser target = activeUser(8L, "真实昵称", GenderEnum.FEMALE.getCode());
        target.setAge(25);
        AppRelationLike like = incomingLike(8L, 7L, "LIK-001");
        RelationLikeListRow row = likeRow(like);
        UserAsset vip = inactiveAsset(7L);
        vip.setVipStatus("active");
        vip.setVipExpireTime(LocalDateTime.now().plusDays(1));

        when(appUserDao.selectById(7L)).thenReturn(current);
        when(accessProjectionService.project(current)).thenReturn("OPEN");
        when(userAssetDao.selectByUserId(7L)).thenReturn(vip);
        when(likeDao.selectOne(any())).thenReturn(like);
        when(likeDao.count(any())).thenReturn(21L, 21L);
        when(likeDao.countVisibleIncomingLikes(eq(7L), eq(true), any(), any())).thenReturn(21L);
        when(likeDao.selectVisibleIncomingLikes(eq(7L), eq(true), any(), any(), any(), any(),
                any(Long.class), any(Integer.class))).thenReturn(List.of(row));
        when(likeDao.selectNewIncomingLikePreviews(eq(7L), any(), any(), any(), any(), eq(5)))
                .thenReturn(List.of(row));
        when(appUserDao.selectList(any())).thenReturn(List.of(target));
        when(matchDao.selectActiveByUser(7L)).thenReturn(List.of());
        when(auditContentService.publicAvatars(List.of(8L))).thenReturn(Map.of(8L, "https://cdn.test/8.jpg"));

        LikesMePageVO result = service.likesMe(7L, 1, 20);

        assertThat(result.getSize()).isEqualTo(20);
        assertThat(result.getAccessMode()).isEqualTo("VIP_ALL_CLEAR");
        assertThat(result.getHasMore()).isTrue();
        assertThat(result.getRecords()).singleElement().satisfies(item -> {
            assertThat(item.getDisplayStatus()).isEqualTo("clear");
            assertThat(item.getUserId()).isEqualTo(8L);
            assertThat(item.getNickname()).isEqualTo("真实昵称");
            assertThat(item.getAvatar()).isEqualTo("https://cdn.test/8.jpg");
        });

        verify(likeDao).selectVisibleIncomingLikes(
                eq(7L), eq(true), any(), any(), any(), any(), eq(0L), eq(20));
    }

    @Test
    void recentViewersReturnsAllTimeAndTodayPvUvWithNaturalDayGroup() {
        AppUser current = activeUser(7L, "当前用户", GenderEnum.MALE.getCode());
        current.setLocationCity("杭州");
        AppUser target = activeUser(8L, "访客", GenderEnum.FEMALE.getCode());
        target.setLocationCity("杭州");
        target.setAge(25);
        target.setSchool("浙江大学");
        target.setIdentity("student");
        target.setIndustry("internet");
        target.setOccupation("designer");
        target.setCompany("星河科技");
        target.setAnnualIncome("income_30_50");
        LocalDateTime lastActiveTime = LocalDateTime.now().minusMinutes(1);
        target.setLastLoginTime(lastActiveTime);

        RelationVisitListRow visit = new RelationVisitListRow();
        visit.setId(101L);
        visit.setVisitNo("VIS-RECENT");
        visit.setVisitorUserId(8L);
        visit.setSourceScene("profile");
        visit.setVisitCount(5L);
        visit.setFirstVisitTime(LocalDateTime.now().minusDays(2));
        visit.setLastVisitTime(LocalDateTime.now().minusMinutes(2));

        when(appUserDao.selectById(7L)).thenReturn(current);
        when(accessProjectionService.project(current)).thenReturn("OPEN");
        when(userAssetDao.selectByUserId(7L)).thenReturn(inactiveAsset(7L));
        when(visitDao.countRecentVisitors(eq(7L), any())).thenReturn(12L);
        when(visitDao.countVisibleRecentVisitors(eq(7L), eq(false), any())).thenReturn(10L);
        when(visitDao.countUnlockedRecentVisitors(eq(7L), any())).thenReturn(0L);
        when(visitDao.selectVisibleRecentVisitors(eq(7L), eq(false), any(), eq(0L), eq(20)))
                .thenReturn(List.of(visit));
        when(appUserDao.selectList(any())).thenReturn(List.of(target));
        when(accessProjectionService.projectAll(any())).thenReturn(Map.of(8L, "OPEN"));
        when(matchDao.selectActiveByUser(7L)).thenReturn(List.of());
        when(auditContentService.publicAvatars(List.of(8L)))
                .thenReturn(Map.of(8L, "https://cdn.test/visitor-8.jpg"));
        when(profileDictionaryService.labels(eq(ProfileDictType.IDENTITY), any()))
                .thenReturn(Map.of("student", "学生"));
        when(profileDictionaryService.labels(eq(ProfileDictType.INDUSTRY), any()))
                .thenReturn(Map.of("internet", "互联网"));
        when(profileDictionaryService.labels(eq(ProfileDictType.OCCUPATION), any()))
                .thenReturn(Map.of("designer", "设计师"));
        when(profileDictionaryService.labels(eq(ProfileDictType.ANNUAL_INCOME), any()))
                .thenReturn(Map.of("income_30_50", "年收入30-50万"));
        when(presenceService.resolve(any(), any())).thenReturn(Map.of(
                8L, new MiniappPresenceService.PresenceSnapshot("online", lastActiveTime, "在线")));
        when(visitEventDao.countTargetStats(eq(7L), any())).thenReturn(
                new RelationVisitStats(30L, 1171L),
                new RelationVisitStats(12L, 36L),
                new RelationVisitStats(7L, 9L));

        RecentViewersPageVO result = service.recentViewers(7L, 1, 20);

        assertThat(result.getTotalPv()).isEqualTo(1171);
        assertThat(result.getVisitorUv7d()).isEqualTo(12);
        assertThat(result.getVisitorPv7d()).isEqualTo(36);
        assertThat(result.getTodayVisitorUv()).isEqualTo(7);
        assertThat(result.getTodayVisitPv()).isEqualTo(9);
        assertThat(result.getTotal()).isEqualTo(12);
        assertThat(result.getVisibleTotal()).isEqualTo(10);
        assertThat(result.getHiddenCount()).isEqualTo(2);
        assertThat(result.getAccessMode()).isEqualTo("BLUR_LIMIT");
        assertThat(result.getRecords()).singleElement().satisfies(item -> {
            assertThat(item.getRecordNo()).isEqualTo("VIS-RECENT");
            assertThat(item.getGroupKey()).isEqualTo("today");
            assertThat(item.getVisitCount()).isEqualTo(5);
            assertThat(item.getDisplayStatus()).isEqualTo("blur");
            assertThat(item.getUserId()).isEqualTo(8L);
            assertThat(item.getNickname()).isEqualTo("访客");
            assertThat(item.getAvatar()).isEqualTo("https://cdn.test/visitor-8.jpg");
            assertThat(item.getAge()).isEqualTo(25);
            assertThat(item.getSchool()).isEqualTo("浙江大学");
            assertThat(item.getOnlineStatus()).isEqualTo("online");
            assertThat(item.getOnlineText()).isEqualTo("在线");
            assertThat(item.getIdentityCode()).isEqualTo("student");
            assertThat(item.getIdentityLabel()).isEqualTo("学生");
            assertThat(item.getIndustryCode()).isEqualTo("internet");
            assertThat(item.getIndustryLabel()).isEqualTo("互联网");
            assertThat(item.getOccupationCode()).isEqualTo("designer");
            assertThat(item.getOccupationLabel()).isEqualTo("设计师");
            assertThat(item.getCompany()).isEqualTo("星河科技");
            assertThat(item.getAnnualIncomeCode()).isEqualTo("income_30_50");
            assertThat(item.getAnnualIncomeLabel()).isEqualTo("年收入30-50万");
        });
    }

    @Test
    void vipVisitorListReturnsAllPeopleClearAndUsesVisibleTotalForPaging() {
        AppUser current = activeUser(7L, "当前用户", GenderEnum.MALE.getCode());
        AppUser target = activeUser(8L, "访客", GenderEnum.FEMALE.getCode());
        RelationVisitListRow row = new RelationVisitListRow();
        row.setId(101L);
        row.setVisitNo("VIS-001");
        row.setVisitorUserId(8L);
        row.setSourceScene("featured");
        row.setFirstVisitTime(LocalDateTime.now().minusHours(2));
        row.setLastVisitTime(LocalDateTime.now().minusHours(1));
        row.setVisitCount(2L);
        UserAsset vip = inactiveAsset(7L);
        vip.setVipStatus("active");
        vip.setVipExpireTime(LocalDateTime.now().plusDays(1));

        when(appUserDao.selectById(7L)).thenReturn(current);
        when(accessProjectionService.project(current)).thenReturn("OPEN");
        when(userAssetDao.selectByUserId(7L)).thenReturn(vip);
        when(visitDao.countRecentVisitors(eq(7L), any())).thenReturn(21L);
        when(visitDao.countVisibleRecentVisitors(eq(7L), eq(true), any())).thenReturn(21L);
        when(visitDao.selectVisibleRecentVisitors(eq(7L), eq(true), any(), eq(0L), eq(20)))
                .thenReturn(List.of(row));
        when(appUserDao.selectList(any())).thenReturn(List.of(target));
        when(accessProjectionService.projectAll(any())).thenReturn(Map.of(8L, "OPEN"));
        when(matchDao.selectActiveByUser(7L)).thenReturn(List.of());
        when(auditContentService.publicAvatars(List.of(8L)))
                .thenReturn(Map.of(8L, "https://cdn.test/visitor-8.jpg"));
        when(visitEventDao.countTargetStats(eq(7L), any()))
                .thenReturn(new RelationVisitStats(0L, 0L));

        RecentViewersPageVO result = service.recentViewers(7L, 1, 20);

        assertThat(result.getTotal()).isEqualTo(21);
        assertThat(result.getVisibleTotal()).isEqualTo(21);
        assertThat(result.getHiddenCount()).isZero();
        assertThat(result.getPages()).isEqualTo(2);
        assertThat(result.getHasMore()).isTrue();
        assertThat(result.getAccessMode()).isEqualTo("VIP_ALL_CLEAR");
        assertThat(result.getRecords()).singleElement().satisfies(item -> {
            assertThat(item.getDisplayStatus()).isEqualTo("clear");
            assertThat(item.getUserId()).isEqualTo(8L);
        });
    }

    @Test
    void cancelLikeStillWorksWhenTargetProfileCanNoLongerFormNewRelationship() {
        AppUser current = activeUser(7L, "当前用户", GenderEnum.MALE.getCode());
        AppUser target = activeUser(8L, "目标用户", null);
        target.setAccountStatus(AccountStatusEnum.FROZEN.getCode());
        when(appUserDao.selectById(7L)).thenReturn(current);
        when(appUserDao.selectById(8L)).thenReturn(target);
        when(accessProjectionService.project(current)).thenReturn("OPEN");
        when(matchDao.selectActivePair(7L, 8L)).thenReturn(null);

        RelationLikeActionVO result = service.cancelLike(7L, 8L);

        assertThat(result.getLikeStatus()).isEqualTo("cancelled");
        assertThat(result.getCanEnterConversation()).isFalse();
        verify(relationDomainService).cancelLike(eq(7L), eq(8L), any());
    }

    @Test
    void activeLikeUsesRelationStateWhileClosedTargetIsExcludedFromOtherProjectedLists() {
        AppUser current = activeUser(7L, "current", GenderEnum.MALE.getCode());
        AppUser target = activeUser(8L, "closed target", GenderEnum.FEMALE.getCode());
        AppRelationLike like = incomingLike(8L, 7L, "LIK-001");
        RelationLikeListRow likeRow = likeRow(like);
        RelationVisitListRow visit = new RelationVisitListRow();
        visit.setId(1L);
        visit.setVisitNo("VIS-001");
        visit.setVisitorUserId(8L);
        visit.setLastVisitTime(LocalDateTime.now());
        AppRelationMatch match = new AppRelationMatch();
        match.setId(20L);
        match.setMatchNo("MAT-001");
        match.setUserLowId(7L);
        match.setUserHighId(8L);
        match.setMatchStatus("matched");
        match.setActiveMarker(1);
        Page<AppRelationMatch> matchPage = new Page<>(1, 20, 1);
        matchPage.setRecords(List.of(match));

        when(appUserDao.selectById(7L)).thenReturn(current);
        when(accessProjectionService.project(current)).thenReturn("OPEN");
        when(accessProjectionService.projectAll(any())).thenReturn(Map.of(8L, "CLOSED"));
        when(userAssetDao.selectByUserId(7L)).thenReturn(inactiveAsset(7L));
        when(likeDao.selectOne(any())).thenReturn(like);
        when(likeDao.count(any())).thenReturn(1L, 1L);
        when(likeDao.countVisibleIncomingLikes(eq(7L), eq(false), any(), any())).thenReturn(1L);
        when(likeDao.selectVisibleIncomingLikes(eq(7L), eq(false), any(), any(), any(), any(),
                any(Long.class), any(Integer.class))).thenReturn(List.of(likeRow));
        when(likeDao.selectNewIncomingLikePreviews(eq(7L), any(), any(), any(), any(), eq(5)))
                .thenReturn(List.of(likeRow));
        when(visitDao.countRecentVisitors(eq(7L), any())).thenReturn(1L);
        when(visitDao.countVisibleRecentVisitors(eq(7L), eq(false), any())).thenReturn(1L);
        when(visitDao.countUnlockedRecentVisitors(eq(7L), any())).thenReturn(0L);
        when(visitDao.selectVisibleRecentVisitors(eq(7L), eq(false), any(), eq(0L), eq(20)))
                .thenReturn(List.of(visit));
        when(matchDao.selectPage(any(), any())).thenReturn(matchPage);
        when(appUserDao.selectList(any())).thenReturn(List.of(target));
        when(matchDao.selectActiveByUser(7L)).thenReturn(List.of());
        when(visitEventDao.countTargetStats(eq(7L), any())).thenReturn(new RelationVisitStats(0L, 0L));

        LikesMePageVO likes = service.likesMe(7L, 1, 10);
        RecentViewersPageVO visitors = service.recentViewers(7L, 1, 20);
        MutualMatchPageVO matches = service.mutualMatches(7L, 1, 20);

        assertThat(likes.getRecords()).hasSize(1);
        assertThat(visitors.getRecords()).isEmpty();
        assertThat(matches.getRecords()).isEmpty();
    }

    private AppUser activeUser(Long id, String nickname, String gender) {
        AppUser user = new AppUser();
        user.setId(id);
        user.setNickname(nickname);
        user.setGender(gender);
        user.setAccountStatus(AccountStatusEnum.NORMAL.getCode());
        user.setFirstLoginCompleted(1);
        return user;
    }

    private AppRelationLike incomingLike(Long fromUserId, Long toUserId, String likeNo) {
        AppRelationLike like = new AppRelationLike();
        like.setId(10L);
        like.setLikeNo(likeNo);
        like.setFromUserId(fromUserId);
        like.setToUserId(toUserId);
        like.setSourceScene("profile");
        like.setLikeStatus("active");
        like.setActiveMarker(1);
        like.setLikedTime(LocalDateTime.now().minusHours(1));
        return like;
    }

    private RelationLikeListRow likeRow(AppRelationLike like) {
        RelationLikeListRow row = new RelationLikeListRow();
        row.setId(like.getId());
        row.setLikeNo(like.getLikeNo());
        row.setFromUserId(like.getFromUserId());
        row.setSourceScene(like.getSourceScene());
        row.setLikedTime(like.getLikedTime());
        row.setNewLike(true);
        return row;
    }

    private UserAsset inactiveAsset(Long userId) {
        UserAsset asset = new UserAsset();
        asset.setUserId(userId);
        asset.setVipStatus("inactive");
        asset.setCoinBalance(100);
        return asset;
    }
}
