package com.spacetime.miniapp.service;

import com.spacetime.common.dao.AppRelationLikeDao;
import com.spacetime.common.dao.AppRelationMatchDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserRelationBlockDao;
import com.spacetime.common.dao.UserUnlockRecordDao;
import com.spacetime.common.entity.AppRelationLike;
import com.spacetime.common.entity.AppRelationMatch;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.UserUnlockRecord;
import com.spacetime.common.enums.AppUserAuditTypeEnum;
import com.spacetime.common.enums.RelationBlockTypeEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.AppUserAuditContentService;
import com.spacetime.common.service.AppUserAuditService;
import com.spacetime.common.service.ProfileDictionaryService;
import com.spacetime.common.service.RelationAccessProjectionService;
import com.spacetime.miniapp.dto.response.PublicProfileVO;
import com.spacetime.miniapp.service.impl.MiniappPublicProfileServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** 公开资料只返回经过准入和审核投影后的关系侧数据。 */
@ExtendWith(MockitoExtension.class)
class MiniappPublicProfileServiceImplTest {
    @Mock private AppUserDao appUserDao;
    @Mock private AppRelationLikeDao likeDao;
    @Mock private AppRelationMatchDao matchDao;
    @Mock private AppUserRelationBlockDao relationBlockDao;
    @Mock private RelationAccessProjectionService accessProjectionService;
    @Mock private AppUserAuditContentService auditContentService;
    @Mock private AppUserAuditService auditService;
    @Mock private ProfileDictionaryService profileDictionaryService;
    @Mock private UserUnlockRecordDao unlockRecordDao;

    @InjectMocks private MiniappPublicProfileServiceImpl service;

    @Test
    void returnsPublicAuditProjectionAndActiveRelationshipState() {
        AppUser current = user(7L, "当前用户");
        AppUser target = user(8L, "目标用户");
        target.setGender("female");
        target.setAge(25);
        target.setHeight(165);
        target.setZodiac("双鱼座");
        target.setLocationCity("330100");
        target.setHometownCity("410100");
        target.setSchool("浙江大学");
        target.setIdentity("WORKER");
        target.setIndustry("INTERNET");
        target.setOccupation("ENGINEER");
        target.setCompany("示例公司");
        target.setAnnualIncome("A30_50");
        target.setTags("[\"徒步\",\"摄影\"]");
        AppRelationLike like = new AppRelationLike();
        like.setFromUserId(7L);
        like.setToUserId(8L);
        like.setLikeStatus("active");
        like.setActiveMarker(1);
        AppRelationMatch match = new AppRelationMatch();
        match.setMatchNo("MAT-001");
        match.setMatchStatus("matched");
        match.setActiveMarker(1);

        when(appUserDao.selectById(7L)).thenReturn(current);
        when(appUserDao.selectById(8L)).thenReturn(target);
        when(accessProjectionService.project(current)).thenReturn("OPEN");
        when(accessProjectionService.project(target)).thenReturn("OPEN");
        when(relationBlockDao.selectActive(7L, 8L, RelationBlockTypeEnum.BLACKLIST.getCode())).thenReturn(null);
        when(relationBlockDao.selectActive(8L, 7L, RelationBlockTypeEnum.BLACKLIST.getCode())).thenReturn(null);
        when(likeDao.selectOne(any())).thenReturn(like);
        when(matchDao.selectActivePair(7L, 8L)).thenReturn(match);
        when(auditContentService.publicAvatar(8L)).thenReturn("https://cdn.test/avatar.jpg");
        when(auditContentService.publicProfileBackground(8L)).thenReturn("https://cdn.test/hero.jpg");
        when(auditContentService.publicAlbumPhotos(8L)).thenReturn(List.of("https://cdn.test/album.jpg"));
        when(auditContentService.publicText(8L, AppUserAuditTypeEnum.ABOUT_ME)).thenReturn("审核通过的自我介绍");
        when(auditService.latestApproved(8L, AppUserAuditTypeEnum.AVATAR)).thenReturn(true);
        when(auditService.hasEffective(8L, AppUserAuditTypeEnum.REAL_NAME)).thenReturn(true);
        when(auditService.hasEffective(8L, AppUserAuditTypeEnum.EDUCATION)).thenReturn(true);
        when(profileDictionaryService.label("app_identity", "WORKER")).thenReturn("职场人");
        when(profileDictionaryService.label("app_industry", "INTERNET")).thenReturn("互联网");
        when(profileDictionaryService.label("app_occupation", "ENGINEER")).thenReturn("工程师");
        when(profileDictionaryService.label("app_annual_income", "A30_50")).thenReturn("30-50万");
        when(profileDictionaryService.label("china_region", "330100")).thenReturn("杭州市");
        when(profileDictionaryService.label("china_region", "410100")).thenReturn("郑州市");

        PublicProfileVO result = service.getPublicProfile(7L, 8L);

        assertThat(result.getUserId()).isEqualTo(8L);
        assertThat(result.getNickname()).isEqualTo("目标用户");
        assertThat(result.getAvatar()).isEqualTo("https://cdn.test/avatar.jpg");
        assertThat(result.getHeroPhoto()).isEqualTo("https://cdn.test/hero.jpg");
        assertThat(result.getPhotos()).containsExactly("https://cdn.test/album.jpg");
        assertThat(result.getCurrentCity()).isEqualTo("杭州市");
        assertThat(result.getHometownCity()).isEqualTo("郑州市");
        assertThat(result.getIdentityLabel()).isEqualTo("职场人");
        assertThat(result.getIndustryLabel()).isEqualTo("互联网");
        assertThat(result.getOccupationLabel()).isEqualTo("工程师");
        assertThat(result.getAnnualIncomeLabel()).isEqualTo("30-50万");
        assertThat(result.getTags()).containsExactly("徒步", "摄影");
        assertThat(result.getIntroduction()).isEqualTo("审核通过的自我介绍");
        assertThat(result.getLiked()).isTrue();
        assertThat(result.getMatched()).isTrue();
        assertThat(result.getMatchNo()).isEqualTo("MAT-001");
        assertThat(result.getCanEnterConversation()).isTrue();
        assertThat(result.getCommunicationMode()).isEqualTo("PRIVATE_MESSAGE");
        assertThat(result.getCertifications()).containsExactly("AVATAR", "REAL_NAME", "EDUCATION");
    }

    @Test
    void rejectsSelfProfileBeforeLoadingTarget() {
        AppUser current = user(7L, "当前用户");
        when(appUserDao.selectById(7L)).thenReturn(current);
        when(accessProjectionService.project(current)).thenReturn("OPEN");

        assertThatThrownBy(() -> service.getPublicProfile(7L, 7L))
                .isInstanceOfSatisfying(BusinessException.class, error -> {
                    assertThat(error.getCode()).isEqualTo(20002);
                    assertThat(error.getMessage()).isEqualTo("不能访问自己的公开资料");
                });

        verify(auditContentService, never()).publicAvatar(any());
    }

    @Test
    void rejectsClosedCurrentUserWithCurrentAccessCode() {
        AppUser current = user(7L, "当前用户");
        when(appUserDao.selectById(7L)).thenReturn(current);
        when(accessProjectionService.project(current)).thenReturn("CLOSED");

        assertThatThrownBy(() -> service.getPublicProfile(7L, 8L))
                .isInstanceOfSatisfying(BusinessException.class,
                        error -> assertThat(error.getCode()).isEqualTo(20001));

        verify(appUserDao, never()).selectById(8L);
    }

    @Test
    void rejectsClosedTargetWithTargetUnavailableCode() {
        AppUser current = user(7L, "当前用户");
        AppUser target = user(8L, "目标用户");
        when(appUserDao.selectById(7L)).thenReturn(current);
        when(appUserDao.selectById(8L)).thenReturn(target);
        when(accessProjectionService.project(current)).thenReturn("OPEN");
        when(accessProjectionService.project(target)).thenReturn("ABNORMAL");

        assertThatThrownBy(() -> service.getPublicProfile(7L, 8L))
                .isInstanceOfSatisfying(BusinessException.class,
                        error -> assertThat(error.getCode()).isEqualTo(20002));

        verify(auditContentService, never()).publicAvatar(any());
    }

    @Test
    void rejectsBlacklistInEitherDirection() {
        AppUser current = user(7L, "当前用户");
        AppUser target = user(8L, "目标用户");
        when(appUserDao.selectById(7L)).thenReturn(current);
        when(appUserDao.selectById(8L)).thenReturn(target);
        when(accessProjectionService.project(current)).thenReturn("OPEN");
        when(accessProjectionService.project(target)).thenReturn("OPEN");
        when(relationBlockDao.selectActive(7L, 8L, RelationBlockTypeEnum.BLACKLIST.getCode())).thenReturn(null);
        when(relationBlockDao.selectActive(8L, 7L, RelationBlockTypeEnum.BLACKLIST.getCode()))
                .thenReturn(new com.spacetime.common.entity.AppUserRelationBlock());

        assertThatThrownBy(() -> service.getPublicProfile(7L, 8L))
                .isInstanceOfSatisfying(BusinessException.class, error -> {
                    assertThat(error.getCode()).isEqualTo(20002);
                    assertThat(error.getMessage()).isEqualTo("目标用户当前不可访问");
                });

        verify(auditContentService, never()).publicAvatar(any());
    }

    @Test
    void keepsOptionalDictionaryFieldsNullWhenProfileCodesAreBlank() {
        AppUser current = user(7L, "当前用户");
        AppUser target = user(8L, "目标用户");
        when(appUserDao.selectById(7L)).thenReturn(current);
        when(appUserDao.selectById(8L)).thenReturn(target);
        when(accessProjectionService.project(current)).thenReturn("OPEN");
        when(accessProjectionService.project(target)).thenReturn("OPEN");
        PublicProfileVO result = service.getPublicProfile(7L, 8L);

        assertThat(result.getCurrentCity()).isNull();
        assertThat(result.getHometownCity()).isNull();
        assertThat(result.getIdentityLabel()).isNull();
        assertThat(result.getIndustryLabel()).isNull();
        assertThat(result.getOccupationLabel()).isNull();
        assertThat(result.getAnnualIncomeLabel()).isNull();
        assertThat(result.getLiked()).isFalse();
        assertThat(result.getMatched()).isFalse();
        assertThat(result.getCanEnterConversation()).isFalse();
        assertThat(result.getCommunicationMode()).isEqualTo("WHISPER");
        verifyNoInteractions(profileDictionaryService);
    }

    @Test
    void activeIdealUnlockChangesSharedProfileFromWhisperToPrivateMessage() {
        AppUser current = user(7L, "当前用户");
        AppUser target = user(8L, "目标用户");
        when(appUserDao.selectById(7L)).thenReturn(current);
        when(appUserDao.selectById(8L)).thenReturn(target);
        when(accessProjectionService.project(current)).thenReturn("OPEN");
        when(accessProjectionService.project(target)).thenReturn("OPEN");
        UserUnlockRecord unlock = new UserUnlockRecord();
        unlock.setStatus("active");
        unlock.setActiveMarker(1);
        unlock.setExpireTime(LocalDateTime.now().plusDays(1));
        when(unlockRecordDao.selectActiveByTargetUser(7L, "ideal", 8L)).thenReturn(unlock);

        PublicProfileVO result = service.getPublicProfile(7L, 8L);

        assertThat(result.getMatched()).isFalse();
        assertThat(result.getCanEnterConversation()).isTrue();
        assertThat(result.getCommunicationMode()).isEqualTo("PRIVATE_MESSAGE");
    }

    @Test
    void expiredIdealUnlockDoesNotExposePrivateMessageMode() {
        AppUser current = user(7L, "当前用户");
        AppUser target = user(8L, "目标用户");
        when(appUserDao.selectById(7L)).thenReturn(current);
        when(appUserDao.selectById(8L)).thenReturn(target);
        when(accessProjectionService.project(current)).thenReturn("OPEN");
        when(accessProjectionService.project(target)).thenReturn("OPEN");
        UserUnlockRecord unlock = new UserUnlockRecord();
        unlock.setStatus("active");
        unlock.setActiveMarker(1);
        unlock.setExpireTime(LocalDateTime.now().minusSeconds(1));
        when(unlockRecordDao.selectActiveByTargetUser(7L, "ideal", 8L)).thenReturn(unlock);

        PublicProfileVO result = service.getPublicProfile(7L, 8L);

        assertThat(result.getCanEnterConversation()).isFalse();
        assertThat(result.getCommunicationMode()).isEqualTo("WHISPER");
    }

    private AppUser user(Long id, String nickname) {
        AppUser user = new AppUser();
        user.setId(id);
        user.setNickname(nickname);
        return user;
    }
}
