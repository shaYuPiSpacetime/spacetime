package com.spacetime.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.RelationPageReq;
import com.spacetime.admin.dto.request.RelationUnlockPageReq;
import com.spacetime.admin.dto.response.AppUserRelationSummaryVO;
import com.spacetime.admin.service.AppUserAdminService;
import com.spacetime.admin.service.AppUserRelationAdminService;
import com.spacetime.common.annotation.RequirePermission;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** APP 用户关系反馈 Controller 契约测试。 */
@ExtendWith(MockitoExtension.class)
class AppUserRelationControllerTest {
    @Mock private AppUserAdminService appUserAdminService;
    @Mock private AppUserRelationAdminService relationService;
    @InjectMocks private AppUserController controller;

    @Test
    void exposesFiveReadOnlyEndpointsWithRelationPermission() {
        List<String> methods = List.of("relationSummary", "relationLikes", "relationVisits",
                "relationMatches", "relationUnlocks");
        for (String methodName : methods) {
            Method method = Arrays.stream(AppUserController.class.getDeclaredMethods())
                    .filter(candidate -> candidate.getName().equals(methodName))
                    .findFirst().orElseThrow();
            RequirePermission permission = method.getAnnotation(RequirePermission.class);
            assertThat(permission).isNotNull();
            assertThat(permission.value()).isEqualTo("user:app:relation:view");
        }
    }

    @Test
    void delegatesSummaryAndFourPagesToDedicatedService() {
        when(relationService.summary(1L)).thenReturn(new AppUserRelationSummaryVO());
        when(relationService.likes(org.mockito.ArgumentMatchers.eq(1L), org.mockito.ArgumentMatchers.any()))
                .thenReturn(new Page<>());
        when(relationService.visits(org.mockito.ArgumentMatchers.eq(1L), org.mockito.ArgumentMatchers.any()))
                .thenReturn(new Page<>());
        when(relationService.matches(org.mockito.ArgumentMatchers.eq(1L), org.mockito.ArgumentMatchers.any()))
                .thenReturn(new Page<>());
        when(relationService.unlocks(org.mockito.ArgumentMatchers.eq(1L), org.mockito.ArgumentMatchers.any()))
                .thenReturn(new Page<>());

        RelationPageReq pageReq = new RelationPageReq();
        RelationUnlockPageReq unlockReq = new RelationUnlockPageReq();
        controller.relationSummary(1L);
        controller.relationLikes(1L, pageReq);
        controller.relationVisits(1L, pageReq);
        controller.relationMatches(1L, pageReq);
        controller.relationUnlocks(1L, unlockReq);

        verify(relationService).summary(1L);
        verify(relationService).likes(1L, pageReq);
        verify(relationService).visits(1L, pageReq);
        verify(relationService).matches(1L, pageReq);
        verify(relationService).unlocks(1L, unlockReq);
    }
}
