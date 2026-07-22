package com.spacetime.admin.service.impl;

import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.RelationPageReq;
import com.spacetime.admin.dto.request.RelationUnlockPageReq;
import com.spacetime.admin.dto.response.AppUserRelationLikeVO;
import com.spacetime.admin.dto.response.AppUserRelationSummaryVO;
import com.spacetime.common.dao.AppRelationLikeDao;
import com.spacetime.common.dao.AppRelationMatchDao;
import com.spacetime.common.dao.AppRelationMatchSourceDao;
import com.spacetime.common.dao.AppRelationVisitDao;
import com.spacetime.common.dao.AppRelationVisitEventDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.UserAssetDao;
import com.spacetime.common.dao.UserUnlockRecordDao;
import com.spacetime.common.entity.AppRelationLike;
import com.spacetime.common.entity.AppRelationMatch;
import com.spacetime.common.entity.AppRelationVisit;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.UserUnlockRecord;
import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.service.AppUserAuditContentService;
import com.spacetime.common.service.RelationAccessProjectionService;
import com.spacetime.common.service.RelationAuditService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.apache.ibatis.builder.MapperBuilderAssistant;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** 管理后台关系反馈查询服务契约测试。 */
@ExtendWith(MockitoExtension.class)
class AppUserRelationAdminServiceImplTest {
    @Mock private AppUserDao appUserDao;
    @Mock private AppRelationLikeDao likeDao;
    @Mock private AppRelationVisitDao visitDao;
    @Mock private AppRelationVisitEventDao visitEventDao;
    @Mock private AppRelationMatchDao matchDao;
    @Mock private AppRelationMatchSourceDao matchSourceDao;
    @Mock private UserUnlockRecordDao unlockRecordDao;
    @Mock private UserAssetDao userAssetDao;
    @Mock private AppUserAuditContentService auditContentService;
    @Mock private RelationAccessProjectionService accessProjectionService;
    @Mock private RelationAuditService relationAuditService;

    @InjectMocks
    private AppUserRelationAdminServiceImpl service;

    @BeforeEach
    void setUpContext() {
        UserContextHolder.set(new UserContext(99L, "审核员", List.of(),
                List.of("user:app:relation:view", "commercial:user:view")));
    }

    @AfterEach
    void clearContext() {
        UserContextHolder.clear();
    }

    @Test
    void rejectsUnsupportedPageSize() {
        AppUser user = activeUser(1L, "当前用户");
        when(appUserDao.selectById(1L)).thenReturn(user);
        RelationPageReq req = new RelationPageReq();
        req.setSize(9);

        assertThatThrownBy(() -> service.likes(1L, req))
                .isInstanceOf(BusinessException.class)
                .extracting("code")
                .isEqualTo(20008);
    }

    @Test
    void acceptsFiveRowsPageForRelationDialog() {
        AppUser user = activeUser(1L, "当前用户");
        when(appUserDao.selectById(1L)).thenReturn(user);
        Page<AppRelationLike> source = new Page<>(1, 5, 0);
        source.setRecords(List.of());
        when(likeDao.selectPage(any(), any())).thenReturn(source);
        RelationPageReq req = new RelationPageReq();
        req.setSize(5);

        Page<AppUserRelationLikeVO> result = service.likes(1L, req);

        assertThat(result.getSize()).isEqualTo(5);
        verify(relationAuditService).recordRelationView(any());
    }

    @Test
    void doesNotApplyHiddenSevenDayFilterToAdminVisitHistory() {
        AppUser user = activeUser(1L, "当前用户");
        when(appUserDao.selectById(1L)).thenReturn(user);
        Page<AppRelationVisit> source = new Page<>(1, 5, 0);
        source.setRecords(List.of());
        when(visitDao.selectPage(any(), any())).thenReturn(source);
        RelationPageReq req = new RelationPageReq();
        req.setSize(5);

        service.visits(1L, req);

        assertThat(req.getStartTime()).isNull();
        verify(relationAuditService).recordRelationView(any());
    }

    @Test
    void acceptsExactUnlockNumberFilter() {
        TableInfoHelper.initTableInfo(
                new MapperBuilderAssistant(new MybatisConfiguration(), ""), UserUnlockRecord.class);
        AppUser user = activeUser(1L, "当前用户");
        when(appUserDao.selectById(1L)).thenReturn(user);
        Page<UserUnlockRecord> source = new Page<>(1, 5, 0);
        source.setRecords(List.of());
        when(unlockRecordDao.selectPage(any(), any())).thenReturn(source);
        RelationUnlockPageReq req = new RelationUnlockPageReq();
        req.setSize(5);
        req.setUnlockNo("ULK-001");

        service.unlocks(1L, req);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<LambdaQueryWrapper<UserUnlockRecord>> wrapperCaptor =
                ArgumentCaptor.forClass(LambdaQueryWrapper.class);
        verify(unlockRecordDao).selectPage(any(), wrapperCaptor.capture());
        assertThat(wrapperCaptor.getValue().getSqlSegment()).contains("unlock_no");
        assertThat(wrapperCaptor.getValue().getParamNameValuePairs()).containsValue("ULK-001");
    }

    @Test
    void anonymizesCancelledCounterpartyBeforeReturningLikePage() {
        AppUser current = activeUser(1L, "当前用户");
        AppUser cancelled = activeUser(2L, "原昵称");
        cancelled.setPhone("13800138000");
        cancelled.setAnonymousNo("ANON-ABC123");
        cancelled.setAccountStatus(AccountStatusEnum.CANCELLED.getCode());
        when(appUserDao.selectById(1L)).thenReturn(current);
        when(appUserDao.selectList(any())).thenReturn(List.of(cancelled));
        when(auditContentService.publicAvatars(any())).thenReturn(java.util.Map.of(2L, "https://avatar.example/2.png"));

        AppRelationLike like = new AppRelationLike();
        like.setId(10L);
        like.setLikeNo("LIK-10");
        like.setFromUserId(1L);
        like.setToUserId(2L);
        like.setSourceScene("profile");
        like.setLikeStatus("active");
        like.setLikedTime(LocalDateTime.of(2026, 7, 21, 10, 0));
        Page<AppRelationLike> page = new Page<>(1, 10, 1);
        page.setRecords(List.of(like));
        when(likeDao.selectPage(any(), any())).thenReturn(page);

        Page<AppUserRelationLikeVO> result = service.likes(1L, new RelationPageReq());

        assertThat(result.getRecords()).singleElement().satisfies(row -> {
            assertThat(row.getCounterparty().getAnonymous()).isTrue();
            assertThat(row.getCounterparty().getUserId()).isNull();
            assertThat(row.getCounterparty().getUserNo()).isEqualTo("ANON-ABC123");
            assertThat(row.getCounterparty().getNickname()).isNull();
            assertThat(row.getCounterparty().getMaskedPhone()).isNull();
            assertThat(row.getCounterparty().getAvatar()).isNull();
        });
        verify(relationAuditService).recordRelationView(any());
    }

    @Test
    void summaryUsesLatestMatchAcrossAllLifecycles() {
        AppUser current = activeUser(1L, "当前用户");
        when(appUserDao.selectById(1L)).thenReturn(current);
        AppRelationMatch latestInvalid = new AppRelationMatch();
        latestInvalid.setId(20L);
        latestInvalid.setMatchStatus("invalid");
        latestInvalid.setMatchedTime(LocalDateTime.of(2026, 7, 21, 16, 0));
        when(matchDao.selectOne(any())).thenReturn(latestInvalid);

        AppUserRelationSummaryVO result = service.summary(1L);

        assertThat(result.getActiveMutualCount()).isZero();
        assertThat(result.getLastMatchTime()).isEqualTo(LocalDateTime.of(2026, 7, 21, 16, 0));
        verify(relationAuditService).recordRelationView(any());
    }

    private AppUser activeUser(Long id, String nickname) {
        AppUser user = new AppUser();
        user.setId(id);
        user.setNickname(nickname);
        user.setAccountStatus(AccountStatusEnum.NORMAL.getCode());
        return user;
    }
}
