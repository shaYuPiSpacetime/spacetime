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
        qa.setStatus(AppUserAuditStatusEnum.APPROVED.getCode());
        qa.setMaterialJson("{\"questionKey\":\"meetingPreference\"}");
        AppUserAuditRecord hasChild = new AppUserAuditRecord();
        hasChild.setAuditType(AppUserAuditTypeEnum.PROFILE_QA.getCode());
        hasChild.setStatus(AppUserAuditStatusEnum.APPROVED.getCode());
        hasChild.setMaterialJson("{\"questionKey\":\"hasChild\"}");
        lenient().when(auditService.effectiveRecords(9L, AppUserAuditTypeEnum.PROFILE_QA))
                .thenReturn(List.of(qa, hasChild));

        int score = calculator.calculate(user);

        assertThat(score).isEqualTo(40);
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
