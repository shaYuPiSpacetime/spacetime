package com.spacetime.miniapp.service;

import com.spacetime.common.dao.AppConfigDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.entity.AppConfig;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.SysDictData;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.ProfileDictionaryService;
import com.spacetime.common.service.RelationAccessProjectionService;
import com.spacetime.miniapp.dto.request.MeetingPreferenceSaveReq;
import com.spacetime.miniapp.dto.response.MeetingPreferenceVO;
import com.spacetime.miniapp.service.impl.MeetingPreferenceServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** PRD-08 见面偏好资料服务测试。 */
@ExtendWith(MockitoExtension.class)
class MeetingPreferenceServiceImplTest {
    @Mock private AppUserDao appUserDao;
    @Mock private AppConfigDao appConfigDao;
    @Mock private ProfileDictionaryService profileDictionaryService;
    @Mock private RelationAccessProjectionService accessProjectionService;

    @InjectMocks private MeetingPreferenceServiceImpl service;

    @Test
    void returnsSavedCodesLabelsAndDynamicOptions() {
        AppUser user = openUser();
        user.setMeetingPreference("NATURAL");
        user.setPreferredActivities("[\"COFFEE\",\"WALK\"]");
        user.setUpdateTime(LocalDateTime.of(2026, 8, 5, 20, 30));
        when(appUserDao.selectById(7L)).thenReturn(user);
        when(accessProjectionService.project(user)).thenReturn("OPEN");
        when(profileDictionaryService.options("meeting_preference"))
                .thenReturn(List.of(dict("NATURAL", "轻松自然", 10)));
        when(profileDictionaryService.options("preferred_activity"))
                .thenReturn(List.of(dict("COFFEE", "喝咖啡", 10), dict("WALK", "散步", 20)));
        when(appConfigDao.selectByKeys(any())).thenReturn(List.of(maxConfig("6")));

        MeetingPreferenceVO result = service.get(7L);

        assertThat(result.getMeetingPreference()).isEqualTo("NATURAL");
        assertThat(result.getMeetingPreferenceLabel()).isEqualTo("轻松自然");
        assertThat(result.getPreferredActivities()).containsExactly("COFFEE", "WALK");
        assertThat(result.getPreferredActivityLabels()).containsExactly("喝咖啡", "散步");
        assertThat(result.getMeetingPreferenceOptions()).singleElement()
                .satisfies(option -> assertThat(option.getEnabled()).isTrue());
        assertThat(result.getMaxActivities()).isEqualTo(6);
        assertThat(result.getDictionaryAvailable()).isTrue();
    }

    @Test
    void savesValidatedDictionaryCodesWithoutChangingRecommendationPreference() {
        AppUser user = openUser();
        when(appUserDao.selectById(7L)).thenReturn(user);
        when(accessProjectionService.project(user)).thenReturn("OPEN");
        when(profileDictionaryService.options("meeting_preference"))
                .thenReturn(List.of(dict("NATURAL", "轻松自然", 10)));
        when(profileDictionaryService.options("preferred_activity"))
                .thenReturn(List.of(dict("COFFEE", "喝咖啡", 10), dict("WALK", "散步", 20)));
        when(profileDictionaryService.requireCode("meeting_preference", "NATURAL", "见面偏好"))
                .thenReturn("NATURAL");
        when(profileDictionaryService.requireCode("preferred_activity", "COFFEE", "见面活动"))
                .thenReturn("COFFEE");
        when(profileDictionaryService.requireCode("preferred_activity", "WALK", "见面活动"))
                .thenReturn("WALK");
        when(appConfigDao.selectByKeys(any())).thenReturn(List.of(maxConfig("6")));

        MeetingPreferenceSaveReq req = new MeetingPreferenceSaveReq();
        req.setMeetingPreference("NATURAL");
        req.setPreferredActivities(List.of("COFFEE", "WALK", "COFFEE"));
        MeetingPreferenceVO result = service.save(7L, req);

        ArgumentCaptor<AppUser> captor = ArgumentCaptor.forClass(AppUser.class);
        verify(appUserDao).updateById(captor.capture());
        assertThat(captor.getValue().getMeetingPreference()).isEqualTo("NATURAL");
        assertThat(captor.getValue().getPreferredActivities()).isEqualTo("[\"COFFEE\",\"WALK\"]");
        assertThat(result.getPreferredActivities()).containsExactly("COFFEE", "WALK");
    }

    @Test
    void rejectsActivitiesOverConfiguredLimit() {
        AppUser user = openUser();
        when(appUserDao.selectById(7L)).thenReturn(user);
        when(accessProjectionService.project(user)).thenReturn("OPEN");
        when(appConfigDao.selectByKeys(any())).thenReturn(List.of(maxConfig("2")));
        MeetingPreferenceSaveReq req = new MeetingPreferenceSaveReq();
        req.setPreferredActivities(List.of("COFFEE", "WALK", "MOVIE"));

        assertThatThrownBy(() -> service.save(7L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("最多选择 2 项");
        verify(appUserDao, never()).updateById(any());
    }

    @Test
    void rejectsUserWithoutCoreAccess() {
        AppUser user = openUser();
        when(appUserDao.selectById(7L)).thenReturn(user);
        when(accessProjectionService.project(user)).thenReturn("CLOSED");

        assertThatThrownBy(() -> service.get(7L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("完成资料和三项认证");
    }

    private AppUser openUser() {
        AppUser user = new AppUser();
        user.setId(7L);
        return user;
    }

    private SysDictData dict(String code, String label, int sort) {
        SysDictData item = new SysDictData();
        item.setDictValue(code);
        item.setDictLabel(label);
        item.setDictSort(sort);
        return item;
    }

    private AppConfig maxConfig(String value) {
        AppConfig config = new AppConfig();
        config.setConfigKey("prd01.profile.preferredActivities.maxCount");
        config.setConfigValue(value);
        return config;
    }
}
