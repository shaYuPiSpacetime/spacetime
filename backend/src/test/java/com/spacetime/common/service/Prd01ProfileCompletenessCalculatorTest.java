package com.spacetime.common.service;

import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserAuditRecord;
import com.spacetime.common.enums.AppUserAuditStatusEnum;
import com.spacetime.common.enums.AppUserAuditTypeEnum;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("PRD01 资料完整度批量计算测试")
class Prd01ProfileCompletenessCalculatorTest {

    @Mock
    private Prd01RuntimeConfigResolver runtimeConfigResolver;
    @Mock
    private AppUserAuditService auditService;
    @InjectMocks
    private Prd01ProfileCompletenessCalculator calculator;

    @Test
    @DisplayName("预加载审核事实后计算完整度不再访问审核服务")
    void shouldCalculateFromPreloadedAuditFactsWithoutDaoAccess() {
        Prd01RuntimeConfigResolver.RuntimeConfigSnapshot snapshot =
                new Prd01RuntimeConfigResolver.RuntimeConfigSnapshot(Map.of());
        Map<String, Object> completeness = Map.of(
                "studentTotalScore", 100,
                "workerTotalScore", 100,
                "items", List.of(
                        Map.of("fieldId", "nickname", "studentScore", 10, "workerScore", 10),
                        Map.of("fieldId", "avatar", "studentScore", 30, "workerScore", 30),
                        Map.of("fieldId", "albumPhotos", "studentScore", 20, "workerScore", 20),
                        Map.of("fieldId", "aboutMe", "studentScore", 15, "workerScore", 15)));
        when(runtimeConfigResolver.snapshot()).thenReturn(snapshot);
        when(runtimeConfigResolver.profileCompleteness(snapshot)).thenReturn(completeness);

        AppUser user = new AppUser();
        user.setId(9L);
        user.setIdentity("WORKER");
        user.setNickname("批量计算用户");
        AppUserAuditRecord avatar = new AppUserAuditRecord();
        avatar.setAuditType(AppUserAuditTypeEnum.AVATAR.getCode());
        avatar.setStatus(AppUserAuditStatusEnum.APPROVED.getCode());

        Prd01ProfileCompletenessCalculator.ProfileCompletenessRules rules = calculator.loadRules();
        int score = calculator.calculate(
                user,
                rules,
                Map.of(AppUserAuditTypeEnum.AVATAR.getCode(), avatar),
                Set.of(AppUserAuditTypeEnum.ALBUM_PHOTO.getCode(), AppUserAuditTypeEnum.ABOUT_ME.getCode()));

        assertThat(score).isEqualTo(75);
        verify(runtimeConfigResolver).snapshot();
        verify(runtimeConfigResolver).profileCompleteness(snapshot);
        verifyNoInteractions(auditService);
    }

    @Test
    @DisplayName("批量评分只读取一次规则和审核，最新未通过头像不继承旧分数且其他生效内容保留")
    void shouldBatchScoresWithLatestAvatarAndEffectiveContentRules() {
        var snapshot = new Prd01RuntimeConfigResolver.RuntimeConfigSnapshot(Map.of());
        when(runtimeConfigResolver.snapshot()).thenReturn(snapshot);
        when(runtimeConfigResolver.profileCompleteness(snapshot)).thenReturn(Map.of(
                "workerTotalScore", 100, "studentTotalScore", 100,
                "items", List.of(
                        Map.of("fieldId", "avatar", "workerScore", 20, "studentScore", 10),
                        Map.of("fieldId", "aboutMe", "workerScore", 20, "studentScore", 10),
                        Map.of("fieldId", "pets", "workerScore", 20, "studentScore", 10))));
        AppUser first = new AppUser(); first.setId(1L); first.setIdentity("WORKER");
        AppUser second = new AppUser(); second.setId(2L); second.setIdentity("STUDENT");
        AppUserAuditRecord oldAvatar = fact(1L, 1L, "AVATAR", "APPROVED", null);
        AppUserAuditRecord newAvatar = fact(2L, 1L, "AVATAR", "PENDING", null);
        var facts = List.of(oldAvatar, newAvatar,
                fact(3L, 1L, "ABOUT_ME", "APPROVED", null),
                fact(4L, 1L, "PROFILE_QA", "APPROVED", "{\"questionKey\":\"pets\"}"),
                fact(5L, 2L, "AVATAR", "APPROVED", null),
                fact(6L, 2L, "ABOUT_ME", "EXPIRED", null));
        when(auditService.profileCompletenessRecords(Set.of(1L, 2L))).thenReturn(facts);

        assertThat(calculator.calculateAll(List.of(first, second, first)))
                .containsExactlyInAnyOrderEntriesOf(Map.of(1L, 40, 2L, 10));
        verify(runtimeConfigResolver).snapshot();
        verify(auditService).profileCompletenessRecords(Set.of(1L, 2L));
        org.mockito.Mockito.verifyNoMoreInteractions(auditService);
    }

    @Test
    @DisplayName("空作者页不读取配置或审核")
    void shouldSkipQueriesForEmptyAuthors() {
        assertThat(calculator.calculateAll(List.of())).isEmpty();
        assertThat(calculator.calculate(null)).isZero();
        verifyNoInteractions(runtimeConfigResolver, auditService);
    }

    private AppUserAuditRecord fact(Long id, Long userId, String type, String status, String material) {
        AppUserAuditRecord record = new AppUserAuditRecord();
        record.setId(id); record.setUserId(userId); record.setAuditType(type); record.setStatus(status);
        record.setMaterialJson(material);
        record.setSubmitTime(java.time.LocalDateTime.of(2026, 11, 5, 10, 0));
        return record;
    }

    @Test
    @DisplayName("关于我资料问答字段按具体题目通过记录参与完整度计分")
    void shouldCountProfileQaQuestionFieldWhenEffectiveQuestionExists() {
        Prd01RuntimeConfigResolver.RuntimeConfigSnapshot snapshot =
                new Prd01RuntimeConfigResolver.RuntimeConfigSnapshot(Map.of());
        Map<String, Object> completeness = Map.of(
                "studentTotalScore", 100,
                "workerTotalScore", 100,
                "items", List.of(
                        Map.of("fieldId", "meetingPreference", "studentScore", 20, "workerScore", 20),
                        Map.of("fieldId", "hasChild", "studentScore", 20, "workerScore", 20),
                        Map.of("fieldId", "pets", "studentScore", 20, "workerScore", 20)));
        when(runtimeConfigResolver.snapshot()).thenReturn(snapshot);
        when(runtimeConfigResolver.profileCompleteness(snapshot)).thenReturn(completeness);

        AppUser user = new AppUser();
        user.setId(9L);
        user.setIdentity("WORKER");
        AppUserAuditRecord qa = new AppUserAuditRecord();
        qa.setAuditType(AppUserAuditTypeEnum.PROFILE_QA.getCode());
        qa.setUserId(9L);
        qa.setStatus(AppUserAuditStatusEnum.APPROVED.getCode());
        qa.setMaterialJson("{\"questionKey\":\"meetingPreference\"}");
        AppUserAuditRecord hasChild = new AppUserAuditRecord();
        hasChild.setAuditType(AppUserAuditTypeEnum.PROFILE_QA.getCode());
        hasChild.setUserId(9L);
        hasChild.setStatus(AppUserAuditStatusEnum.APPROVED.getCode());
        hasChild.setMaterialJson("{\"questionKey\":\"hasChild\"}");
        when(auditService.profileCompletenessRecords(java.util.Set.of(9L)))
                .thenReturn(List.of(qa, hasChild));

        int score = calculator.calculate(user);

        assertThat(score).isEqualTo(40);
        verify(auditService).profileCompletenessRecords(java.util.Set.of(9L));
    }

    @Test
    @DisplayName("歌曲与子女字段按现有用户表字段参与完整度计分")
    void shouldCountFavoriteSongAndHasChildAliases() {
        Prd01RuntimeConfigResolver.RuntimeConfigSnapshot snapshot =
                new Prd01RuntimeConfigResolver.RuntimeConfigSnapshot(Map.of());
        Map<String, Object> completeness = Map.of(
                "studentTotalScore", 100,
                "workerTotalScore", 100,
                "items", List.of(
                        Map.of("fieldId", "favoriteSong", "studentScore", 10, "workerScore", 10),
                        Map.of("fieldId", "wantChild", "studentScore", 10, "workerScore", 10)));
        when(runtimeConfigResolver.snapshot()).thenReturn(snapshot);
        when(runtimeConfigResolver.profileCompleteness(snapshot)).thenReturn(completeness);

        AppUser user = new AppUser();
        user.setId(9L);
        user.setIdentity("WORKER");
        user.setFavoriteSongName("Song A");
        user.setWantChild("NO_CHILD");

        int score = calculator.calculate(user);

        assertThat(score).isEqualTo(20);
    }

    @Test
    @DisplayName("字典化见面偏好主资料字段应直接参与完整度计分")
    void shouldCountStructuredMeetingPreferenceFields() {
        Prd01ProfileCompletenessCalculator.ProfileCompletenessRules rules =
                new Prd01ProfileCompletenessCalculator.ProfileCompletenessRules(Map.of(
                        "studentTotalScore", 40,
                        "workerTotalScore", 40,
                        "items", List.of(
                                Map.of("fieldId", "meetingPreference", "studentScore", 20, "workerScore", 20),
                                Map.of("fieldId", "preferredActivities", "studentScore", 20, "workerScore", 20))));
        AppUser user = new AppUser();
        user.setId(9L);
        user.setIdentity("WORKER");
        user.setMeetingPreference("NATURAL");
        user.setPreferredActivities("[\"COFFEE\"]");

        int score = calculator.calculate(user, rules, Map.of(), Set.of(), Set.of());

        assertThat(score).isEqualTo(40);
        verifyNoInteractions(auditService);
    }

    @Test
    @DisplayName("现居地和家乡按省市两级完成区县历史计分项")
    void shouldCountLegacyDistrictScoreItemsFromProvinceAndCity() {
        Prd01RuntimeConfigResolver.RuntimeConfigSnapshot snapshot =
                new Prd01RuntimeConfigResolver.RuntimeConfigSnapshot(Map.of());
        Map<String, Object> completeness = Map.of(
                "studentTotalScore", 20,
                "workerTotalScore", 20,
                "items", List.of(
                        Map.of("fieldId", "locationDistrict", "studentScore", 10, "workerScore", 10),
                        Map.of("fieldId", "hometownDistrict", "studentScore", 10, "workerScore", 10)));
        when(runtimeConfigResolver.snapshot()).thenReturn(snapshot);
        when(runtimeConfigResolver.profileCompleteness(snapshot)).thenReturn(completeness);

        AppUser user = new AppUser();
        user.setId(9L);
        user.setIdentity("WORKER");
        user.setLocationProvince("330000");
        user.setLocationCity("330100");
        user.setHometownProvince("410000");
        user.setHometownCity("410100");

        assertThat(calculator.calculate(user)).isEqualTo(20);
    }
}
