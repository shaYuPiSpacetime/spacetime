package com.spacetime.miniapp.service;

import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.ExternalProviderTaskDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserAuditRecord;
import com.spacetime.common.entity.ExternalProviderTask;
import com.spacetime.common.provider.AudioSafetyProvider;
import com.spacetime.common.provider.ProviderCheckResult;
import com.spacetime.common.service.AppUserAuditService;
import com.spacetime.common.service.Prd01RuntimeConfigResolver;
import com.spacetime.miniapp.dto.request.VoiceIntroSubmitReq;
import com.spacetime.miniapp.dto.response.VoiceIntroVO;
import com.spacetime.miniapp.service.impl.VoiceIntroServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("移动端语音介绍微信审核")
class VoiceIntroServiceImplTest {

    @Mock
    private AppUserDao appUserDao;
    @Mock
    private ExternalProviderTaskDao externalProviderTaskDao;
    @Mock
    private AudioSafetyProvider audioSafetyProvider;
    @Mock
    private AppUserAuditService auditService;
    @Mock
    private Prd01RuntimeConfigResolver runtimeConfigResolver;

    @InjectMocks
    private VoiceIntroServiceImpl service;

    private Prd01RuntimeConfigResolver.RuntimeConfigSnapshot snapshot;

    @BeforeEach
    void setUp() {
        snapshot = new Prd01RuntimeConfigResolver.RuntimeConfigSnapshot(Map.of());
        when(runtimeConfigResolver.snapshot()).thenReturn(snapshot);
        when(runtimeConfigResolver.voiceDurationRange(snapshot))
                .thenReturn(new Prd01RuntimeConfigResolver.DurationRange(10, 60));
        when(runtimeConfigResolver.fieldVisible(snapshot, "voiceIntro", true)).thenReturn(true);
    }

    @Test
    @DisplayName("微信异步受理后保存 traceId 并进入机审中")
    void shouldPersistWechatTraceAndStartMachineReview() {
        AppUser user = new AppUser();
        user.setId(7L);
        user.setOpenid("openid-7");
        when(appUserDao.selectById(7L)).thenReturn(user);
        when(auditService.latestRecord(7L, com.spacetime.common.enums.AppUserAuditTypeEnum.VOICE_INTRO))
                .thenReturn(null);
        when(auditService.submit(any())).thenAnswer(invocation -> {
            AppUserAuditRecord record = invocation.getArgument(0);
            record.setId(101L);
            return record;
        });
        when(audioSafetyProvider.check("openid-7", "https://static.example.com/voice/intro.mp3", 20))
                .thenReturn(ProviderCheckResult.pending(
                        "wechat-content-security",
                        "{\"conclusion\":\"REVIEW\"}",
                        false,
                        "trace-audio-101",
                        "wechat_media_async_pending"));
        org.mockito.Mockito.doAnswer(invocation -> {
            ExternalProviderTask task = invocation.getArgument(0);
            task.setId(201L);
            return null;
        }).when(externalProviderTaskDao).insert(any());

        VoiceIntroSubmitReq request = new VoiceIntroSubmitReq();
        request.setVoiceUrl("https://static.example.com/voice/intro.mp3");
        request.setDuration(20);

        VoiceIntroVO result = service.submitVoiceIntro(7L, request);

        ArgumentCaptor<ExternalProviderTask> taskCaptor = ArgumentCaptor.forClass(ExternalProviderTask.class);
        verify(externalProviderTaskDao).insert(taskCaptor.capture());
        ExternalProviderTask task = taskCaptor.getValue();
        assertThat(task.getExternalTaskId()).isEqualTo("trace-audio-101");
        assertThat(task.getTaskStatus()).isEqualTo("PENDING");
        assertThat(task.getRequestPayloadJson())
                .contains("https://static.example.com/voice/intro.mp3")
                .contains("\"duration\":20");
        verify(auditService).machineStart(101L, 201L, "{\"conclusion\":\"REVIEW\"}");
        assertThat(result.getVoiceIntroAuditStatus()).isEqualTo("REVIEWING");
        assertThat(result.getVisibleToPublic()).isFalse();
    }
}
