package com.spacetime.miniapp.service;

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
import com.spacetime.common.dto.RelationLikeListRow;
import com.spacetime.common.entity.AppRelationLike;
import com.spacetime.common.entity.AppRelationLikeInboxState;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.UserAsset;
import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.common.enums.GenderEnum;
import com.spacetime.common.constant.ProfileDictType;
import com.spacetime.common.service.AppUserAuditContentService;
import com.spacetime.common.service.MiniappPresenceService;
import com.spacetime.common.service.ProfileDictionaryService;
import com.spacetime.common.service.RelationAccessProjectionService;
import com.spacetime.common.service.RelationDomainService;
import com.spacetime.miniapp.dto.request.LikesMeReadReq;
import com.spacetime.miniapp.dto.response.LikesMePageVO;
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

/** 喜欢我的可见范围、新喜欢快照与读取游标规则。 */
@ExtendWith(MockitoExtension.class)
class LikesMeInboxServiceTest {
    @Mock private AppUserDao appUserDao;
    @Mock private AppRelationLikeDao likeDao;
    @Mock private AppRelationLikeInboxStateDao inboxStateDao;
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
    void ordinaryUserGetsAllUnlockedPlusTenLockedWithIndependentTrueCounts() {
        LocalDateTime baselineTime = LocalDateTime.of(2026, 7, 22, 8, 0);
        LocalDateTime snapshotTime = LocalDateTime.of(2026, 7, 23, 9, 0);
        AppRelationLike snapshot = like(30L, 30L, "LIK-030", snapshotTime);
        AppRelationLikeInboxState state = new AppRelationLikeInboxState();
        state.setUserId(7L);
        state.setLastReadLikedTime(baselineTime);
        state.setLastReadLikeId(10L);

        RelationLikeListRow newLocked = row(30L, 30L, "LIK-030", snapshotTime, null, true);
        RelationLikeListRow earlierUnlocked = row(9L, 9L, "LIK-009",
                baselineTime.minusHours(1), baselineTime.plusMinutes(10), false);

        stubBaseQuery(snapshot, state, inactiveAsset(), 30L, 12L, 17L,
                List.of(newLocked, earlierUnlocked), List.of(newLocked));
        when(appUserDao.selectList(any())).thenReturn(List.of(
                user(30L, "新喜欢"), user(9L, "已解锁")));
        when(matchDao.selectActiveByUser(7L)).thenReturn(List.of());
        when(auditContentService.publicAvatars(List.of(30L, 9L)))
                .thenReturn(Map.of(
                        30L, "https://cdn.test/30.jpg",
                        9L, "https://cdn.test/9.jpg"));

        LikesMePageVO result = service.likesMe(7L, 1, 20, null);

        assertThat(result.getTotal()).isEqualTo(30);
        assertThat(result.getNewCount()).isEqualTo(12);
        assertThat(result.getVisibleTotal()).isEqualTo(17);
        assertThat(result.getHiddenCount()).isEqualTo(13);
        assertThat(result.getPages()).isEqualTo(1);
        assertThat(result.getAccessMode()).isEqualTo("MIXED");
        assertThat(result.getReadCursor()).isNotBlank();
        assertThat(result.getNewLikePreviewAvatars()).singleElement().satisfies(preview -> {
            assertThat(preview.getRecordNo()).isEqualTo("LIK-030");
            assertThat(preview.getDisplayStatus()).isEqualTo("blur");
            assertThat(preview.getAvatar()).isEqualTo("https://cdn.test/30.jpg");
        });
        assertThat(result.getRecords()).extracting("recordNo")
                .containsExactly("LIK-030", "LIK-009");
        assertThat(result.getRecords().get(0).getIsNew()).isTrue();
        assertThat(result.getRecords().get(0).getGroupKey()).isEqualTo("new");
        assertThat(result.getRecords().get(0).getDisplayStatus()).isEqualTo("blur");
        assertThat(result.getRecords().get(1).getIsNew()).isFalse();
        assertThat(result.getRecords().get(1).getGroupKey()).isEqualTo("earlier_unlocked");
        assertThat(result.getRecords().get(1).getDisplayStatus()).isEqualTo("clear");
        assertThat(result.getRecords().get(1).getUnlockTime()).isEqualTo(baselineTime.plusMinutes(10));
    }

    @Test
    void vipGetsAllVisibleRecordsAndClearNewLikePreview() {
        LocalDateTime snapshotTime = LocalDateTime.of(2026, 7, 23, 10, 0);
        AppRelationLike snapshot = like(40L, 40L, "LIK-040", snapshotTime);
        RelationLikeListRow newLike = row(40L, 40L, "LIK-040", snapshotTime, null, true);
        UserAsset vip = inactiveAsset();
        vip.setVipStatus("active");
        vip.setVipExpireTime(snapshotTime.plusDays(1));

        stubBaseQuery(snapshot, null, vip, 40L, 40L, 40L, List.of(newLike), List.of(newLike));
        when(appUserDao.selectList(any())).thenReturn(List.of(user(40L, "VIP可见")));
        when(matchDao.selectActiveByUser(7L)).thenReturn(List.of());
        when(auditContentService.publicAvatars(List.of(40L)))
                .thenReturn(Map.of(40L, "https://cdn.test/40.jpg"));

        LikesMePageVO result = service.likesMe(7L, 1, 20, null);

        assertThat(result.getTotal()).isEqualTo(40);
        assertThat(result.getNewCount()).isEqualTo(40);
        assertThat(result.getVisibleTotal()).isEqualTo(40);
        assertThat(result.getHiddenCount()).isZero();
        assertThat(result.getPages()).isEqualTo(2);
        assertThat(result.getHasMore()).isTrue();
        assertThat(result.getAccessMode()).isEqualTo("VIP_ALL_CLEAR");
        assertThat(result.getRecords()).singleElement().satisfies(item -> {
            assertThat(item.getDisplayStatus()).isEqualTo("clear");
            assertThat(item.getIsNew()).isTrue();
        });
        assertThat(result.getNewLikePreviewAvatars()).singleElement()
                .extracting("avatar").isEqualTo("https://cdn.test/40.jpg");
    }

    @Test
    void returnsCompleteProfileFieldsForBothBlurAndClearRecords() {
        LocalDateTime snapshotTime = LocalDateTime.now();
        AppRelationLike snapshot = like(50L, 50L, "LIK-050", snapshotTime);
        RelationLikeListRow blurred = row(50L, 50L, "LIK-050", snapshotTime, null, true);
        RelationLikeListRow clear = row(49L, 49L, "LIK-049",
                snapshotTime.minusHours(1), snapshotTime.minusMinutes(10), false);
        AppUser blurredUser = profileUser(50L, "模糊用户");
        AppUser clearUser = profileUser(49L, "清晰用户");

        stubBaseQuery(snapshot, null, inactiveAsset(), 2L, 1L, 2L,
                List.of(blurred, clear), List.of(blurred));
        when(appUserDao.selectList(any())).thenReturn(List.of(blurredUser, clearUser));
        when(matchDao.selectActiveByUser(7L)).thenReturn(List.of());
        when(auditContentService.publicAvatars(List.of(50L, 49L)))
                .thenReturn(Map.of(
                        50L, "https://cdn.test/50.jpg",
                        49L, "https://cdn.test/49.jpg"));
        when(profileDictionaryService.labels(eq(ProfileDictType.IDENTITY), any()))
                .thenReturn(Map.of("WORKER", "职场人"));
        when(profileDictionaryService.labels(eq(ProfileDictType.INDUSTRY), any()))
                .thenReturn(Map.of("INTERNET", "互联网"));
        when(profileDictionaryService.labels(eq(ProfileDictType.OCCUPATION), any()))
                .thenReturn(Map.of("PRODUCT_MANAGER", "产品经理"));
        when(profileDictionaryService.labels(eq(ProfileDictType.ANNUAL_INCOME), any()))
                .thenReturn(Map.of("FROM_300K_TO_500K", "30-50万"));
        when(presenceService.resolve(any(), any())).thenReturn(Map.of(
                50L, new MiniappPresenceService.PresenceSnapshot(
                        "online", blurredUser.getLastLoginTime(), "在线"),
                49L, new MiniappPresenceService.PresenceSnapshot(
                        "online", clearUser.getLastLoginTime(), "在线")));

        LikesMePageVO result = service.likesMe(7L, 1, 20, null);

        assertThat(result.getNewLikePreviewAvatars()).singleElement().satisfies(preview ->
                assertThat(preview)
                        .hasFieldOrPropertyWithValue("onlineStatus", "online")
                        .hasFieldOrPropertyWithValue("avatar", "https://cdn.test/50.jpg"));
        assertThat(result.getRecords().get(0))
                .hasFieldOrPropertyWithValue("userId", 50L)
                .hasFieldOrPropertyWithValue("nickname", "模糊用户")
                .hasFieldOrPropertyWithValue("avatar", "https://cdn.test/50.jpg")
                .hasFieldOrPropertyWithValue("age", 28)
                .hasFieldOrPropertyWithValue("onlineStatus", "online")
                .hasFieldOrProperty("lastActiveTime")
                .hasFieldOrPropertyWithValue("onlineText", "在线")
                .hasFieldOrPropertyWithValue("annualIncomeCode", "FROM_300K_TO_500K")
                .hasFieldOrPropertyWithValue("annualIncomeLabel", "30-50万")
                .hasFieldOrPropertyWithValue("identityCode", "WORKER")
                .hasFieldOrPropertyWithValue("identityLabel", "职场人")
                .hasFieldOrPropertyWithValue("industryCode", "INTERNET")
                .hasFieldOrPropertyWithValue("industryLabel", "互联网")
                .hasFieldOrPropertyWithValue("occupationCode", "PRODUCT_MANAGER")
                .hasFieldOrPropertyWithValue("occupationLabel", "产品经理")
                .hasFieldOrPropertyWithValue("company", "星河科技")
                .hasFieldOrPropertyWithValue("school", "浙江大学");
        assertThat(result.getRecords().get(1))
                .hasFieldOrPropertyWithValue("onlineStatus", "online")
                .hasFieldOrPropertyWithValue("onlineText", "在线")
                .hasFieldOrPropertyWithValue("identityCode", "WORKER")
                .hasFieldOrPropertyWithValue("identityLabel", "职场人")
                .hasFieldOrPropertyWithValue("industryCode", "INTERNET")
                .hasFieldOrPropertyWithValue("industryLabel", "互联网")
                .hasFieldOrPropertyWithValue("occupationCode", "PRODUCT_MANAGER")
                .hasFieldOrPropertyWithValue("occupationLabel", "产品经理")
                .hasFieldOrPropertyWithValue("company", "星河科技")
                .hasFieldOrPropertyWithValue("annualIncomeCode", "FROM_300K_TO_500K")
                .hasFieldOrPropertyWithValue("annualIncomeLabel", "30-50万")
                .hasFieldOrPropertyWithValue("school", "浙江大学");
    }

    @Test
    void readAcknowledgementAdvancesOnlyTheReturnedSnapshotAndIsIdempotent() {
        LocalDateTime baselineTime = LocalDateTime.of(2026, 7, 22, 8, 0);
        LocalDateTime snapshotTime = LocalDateTime.of(2026, 7, 23, 9, 0);
        AppRelationLike snapshot = like(30L, 30L, "LIK-030", snapshotTime);
        AppRelationLikeInboxState state = new AppRelationLikeInboxState();
        state.setUserId(7L);
        state.setLastReadLikedTime(baselineTime);
        state.setLastReadLikeId(10L);
        RelationLikeListRow newLike = row(30L, 30L, "LIK-030", snapshotTime, null, true);

        stubBaseQuery(snapshot, state, inactiveAsset(), 1L, 1L, 1L,
                List.of(newLike), List.of(newLike));
        when(appUserDao.selectList(any())).thenReturn(List.of(user(30L, "新喜欢")));
        when(matchDao.selectActiveByUser(7L)).thenReturn(List.of());
        when(likeDao.selectById(30L)).thenReturn(snapshot);
        when(inboxStateDao.insertIgnore(eq(7L), eq(snapshotTime), eq(30L), any())).thenReturn(0);

        LikesMePageVO page = service.likesMe(7L, 1, 20, null);
        LikesMeReadReq request = new LikesMeReadReq();
        request.setReadCursor(page.getReadCursor());
        service.confirmLikesMeRead(7L, request);
        service.confirmLikesMeRead(7L, request);

        verify(inboxStateDao, org.mockito.Mockito.times(2))
                .advance(eq(7L), eq(snapshotTime), eq(30L), any());
    }

    @Test
    void laterPagesReuseTheFirstPageBaselineAndSnapshotAfterReadStateAdvances() {
        LocalDateTime baselineTime = LocalDateTime.of(2026, 7, 22, 8, 0);
        LocalDateTime snapshotTime = LocalDateTime.of(2026, 7, 23, 9, 0);
        AppRelationLike snapshot = like(30L, 30L, "LIK-030", snapshotTime);
        AppRelationLikeInboxState initialState = new AppRelationLikeInboxState();
        initialState.setUserId(7L);
        initialState.setLastReadLikedTime(baselineTime);
        initialState.setLastReadLikeId(10L);
        RelationLikeListRow row = row(30L, 30L, "LIK-030", snapshotTime, null, true);

        stubBaseQuery(snapshot, initialState, inactiveAsset(), 1L, 1L, 1L,
                List.of(row), List.of(row));
        when(appUserDao.selectList(any())).thenReturn(List.of(user(30L, "新喜欢")));
        when(matchDao.selectActiveByUser(7L)).thenReturn(List.of());
        when(likeDao.selectById(30L)).thenReturn(snapshot);

        LikesMePageVO firstPage = service.likesMe(7L, 1, 1, null);
        service.likesMe(7L, 2, 1, firstPage.getReadCursor());

        verify(inboxStateDao, org.mockito.Mockito.times(1)).selectByUserId(7L);
        verify(likeDao).selectVisibleIncomingLikes(
                eq(7L), eq(false),
                eq(baselineTime), eq(10L),
                eq(snapshotTime), eq(30L),
                eq(1L), eq(1));
    }

    private void stubBaseQuery(AppRelationLike snapshot,
                               AppRelationLikeInboxState state,
                               UserAsset asset,
                               long total,
                               long newCount,
                               long visibleTotal,
                               List<RelationLikeListRow> rows,
                               List<RelationLikeListRow> previews) {
        AppUser current = user(7L, "当前用户");
        current.setGender(GenderEnum.MALE.getCode());
        when(appUserDao.selectById(7L)).thenReturn(current);
        when(accessProjectionService.project(current)).thenReturn("OPEN");
        when(userAssetDao.selectByUserId(7L)).thenReturn(asset);
        when(inboxStateDao.selectByUserId(7L)).thenReturn(state);
        when(likeDao.selectOne(any())).thenReturn(snapshot);
        when(likeDao.count(any())).thenReturn(total, newCount);
        when(likeDao.countVisibleIncomingLikes(eq(7L), any(Boolean.class), any(), any()))
                .thenReturn(visibleTotal);
        when(likeDao.selectVisibleIncomingLikes(eq(7L), any(Boolean.class), any(), any(), any(), any(),
                any(Long.class), any(Integer.class))).thenReturn(rows);
        when(likeDao.selectNewIncomingLikePreviews(eq(7L), any(), any(), any(), any(), eq(5)))
                .thenReturn(previews);
    }

    private AppUser user(Long id, String nickname) {
        AppUser user = new AppUser();
        user.setId(id);
        user.setNickname(nickname);
        user.setGender(id.equals(7L) ? GenderEnum.MALE.getCode() : GenderEnum.FEMALE.getCode());
        user.setAccountStatus(AccountStatusEnum.NORMAL.getCode());
        user.setFirstLoginCompleted(1);
        return user;
    }

    private AppUser profileUser(Long id, String nickname) {
        AppUser user = user(id, nickname);
        user.setAge(28);
        user.setLastLoginTime(LocalDateTime.now().minusMinutes(1));
        user.setIdentity("WORKER");
        user.setIndustry("INTERNET");
        user.setOccupation("PRODUCT_MANAGER");
        user.setCompany("星河科技");
        user.setAnnualIncome("FROM_300K_TO_500K");
        user.setSchool("浙江大学");
        return user;
    }

    private UserAsset inactiveAsset() {
        UserAsset asset = new UserAsset();
        asset.setUserId(7L);
        asset.setVipStatus("inactive");
        return asset;
    }

    private AppRelationLike like(Long id, Long fromUserId, String likeNo, LocalDateTime likedTime) {
        AppRelationLike like = new AppRelationLike();
        like.setId(id);
        like.setLikeNo(likeNo);
        like.setFromUserId(fromUserId);
        like.setToUserId(7L);
        like.setLikeStatus("active");
        like.setActiveMarker(1);
        like.setLikedTime(likedTime);
        return like;
    }

    private RelationLikeListRow row(Long id,
                                    Long fromUserId,
                                    String likeNo,
                                    LocalDateTime likedTime,
                                    LocalDateTime unlockTime,
                                    boolean isNew) {
        RelationLikeListRow row = new RelationLikeListRow();
        row.setId(id);
        row.setLikeNo(likeNo);
        row.setFromUserId(fromUserId);
        row.setSourceScene("profile");
        row.setLikedTime(likedTime);
        row.setUnlockTime(unlockTime);
        row.setNewLike(isNew);
        return row;
    }
}
