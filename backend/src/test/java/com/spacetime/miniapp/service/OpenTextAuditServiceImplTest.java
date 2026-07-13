package com.spacetime.miniapp.service;

import com.spacetime.common.dao.ExternalProviderTaskDao;
import com.spacetime.common.entity.AppUserAuditRecord;
import com.spacetime.common.entity.ExternalProviderTask;
import com.spacetime.common.enums.AppUserAuditStatusEnum;
import com.spacetime.common.enums.AppUserAuditTypeEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.provider.ProviderCheckResult;
import com.spacetime.common.provider.TextSafetyProvider;
import com.spacetime.common.service.AppUserAuditService;
import com.spacetime.miniapp.dto.request.IntroductionSubmitReq;
import com.spacetime.miniapp.dto.response.OpenTextAuditVO;
import com.spacetime.miniapp.service.impl.OpenTextAuditServiceImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 移动端自我介绍审核服务测试。
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("移动端自我介绍审核服务")
class OpenTextAuditServiceImplTest {

    @Mock
    private ExternalProviderTaskDao externalProviderTaskDao;
    @Mock
    private TextSafetyProvider textSafetyProvider;
    @Mock
    private AppUserAuditService auditService;

    @InjectMocks
    private OpenTextAuditServiceImpl service;

    @Test
    @DisplayName("提交达标自我介绍后生成关于我审核记录并执行机审")
    void shouldSubmitIntroductionForTextSafetyAudit() {
        String content = "我是一个认真真诚的人，平时喜欢阅读、徒步和做饭，也愿意倾听和分享生活。";
        IntroductionSubmitReq req = new IntroductionSubmitReq();
        req.setAboutMe(content);
        when(auditService.latestRecord(7L, AppUserAuditTypeEnum.ABOUT_ME)).thenReturn(null, approvedRecord(content));
        when(auditService.submit(any())).thenAnswer(invocation -> {
            AppUserAuditRecord record = invocation.getArgument(0);
            record.setId(101L);
            return record;
        });
        when(textSafetyProvider.check("ABOUT_ME", content))
                .thenReturn(ProviderCheckResult.safe("mock-text", "{\"result\":\"safe\"}", true));
        org.mockito.Mockito.doAnswer(invocation -> {
            ExternalProviderTask task = invocation.getArgument(0);
            task.setId(201L);
            return null;
        }).when(externalProviderTaskDao).insert(any());

        OpenTextAuditVO result = service.submitIntroduction(7L, req);

        ArgumentCaptor<AppUserAuditRecord> recordCaptor = ArgumentCaptor.forClass(AppUserAuditRecord.class);
        verify(auditService).submit(recordCaptor.capture());
        assertThat(recordCaptor.getValue().getAuditType()).isEqualTo("ABOUT_ME");
        assertThat(recordCaptor.getValue().getContentText()).isEqualTo(content);
        verify(auditService).machineApprove(101L, 201L, "{\"result\":\"safe\"}");
        assertThat(result.getFieldName()).isEqualTo("ABOUT_ME");
        assertThat(result.getAuditStatus()).isEqualTo("APPROVED");
    }

    @Test
    @DisplayName("自我介绍少于20字时拒绝提交")
    void shouldRejectShortIntroduction() {
        IntroductionSubmitReq req = new IntroductionSubmitReq();
        req.setAboutMe("这段自我介绍不足二十字");

        assertThatThrownBy(() -> service.submitIntroduction(7L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("20-300");
        verify(auditService, never()).submit(any());
    }

    @Test
    @DisplayName("最新自我介绍仍在审核时不允许重复提交")
    void shouldRejectDuplicateIntroductionWhilePending() {
        AppUserAuditRecord pending = new AppUserAuditRecord();
        pending.setStatus(AppUserAuditStatusEnum.PENDING.getCode());
        when(auditService.latestRecord(7L, AppUserAuditTypeEnum.ABOUT_ME)).thenReturn(pending);
        IntroductionSubmitReq req = new IntroductionSubmitReq();
        req.setAboutMe("我是一个认真真诚的人，平时喜欢阅读、徒步和做饭，也愿意倾听和分享生活。");

        assertThatThrownBy(() -> service.submitIntroduction(7L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("审核中");
        verify(auditService, never()).submit(any());
    }

    private AppUserAuditRecord approvedRecord(String content) {
        AppUserAuditRecord record = new AppUserAuditRecord();
        record.setAuditType(AppUserAuditTypeEnum.ABOUT_ME.getCode());
        record.setStatus(AppUserAuditStatusEnum.APPROVED.getCode());
        record.setContentText(content);
        return record;
    }
}
