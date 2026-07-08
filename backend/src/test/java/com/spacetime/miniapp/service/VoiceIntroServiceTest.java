package com.spacetime.miniapp.service;

import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserVoiceIntroRecordDao;
import com.spacetime.common.dao.ExternalProviderTaskDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.provider.AudioSafetyProvider;
import com.spacetime.common.provider.ProviderCheckResult;
import com.spacetime.miniapp.dto.request.VoiceIntroSubmitReq;
import com.spacetime.miniapp.service.impl.VoiceIntroServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("VoiceIntroService L3 测试")
class VoiceIntroServiceTest {

    @Mock
    private AppUserDao appUserDao;
    @Mock
    private AppUserVoiceIntroRecordDao voiceIntroRecordDao;
    @Mock
    private ExternalProviderTaskDao externalProviderTaskDao;
    @Mock
    private AudioSafetyProvider audioSafetyProvider;

    @InjectMocks
    private VoiceIntroServiceImpl service;

    private AppUser user;

    @BeforeEach
    void setUp() {
        user = new AppUser();
        user.setId(1L);
        when(appUserDao.selectById(1L)).thenReturn(user);
    }

    @Test
    @DisplayName("mock 音频安全通过时写入 VOICE_APPROVED，业务来源仍是 MACHINE")
    void shouldApproveVoiceIntroWithMachineSourceWhenMockProviderSafe() {
        when(audioSafetyProvider.check("https://cdn.example.com/voice.m4a", 18))
                .thenReturn(ProviderCheckResult.safe("mock-audio", "{\"risk\":\"none\"}", true));

        var vo = service.submitVoiceIntro(1L, request("https://cdn.example.com/voice.m4a", 18));

        assertThat(vo.getVoiceIntroAuditStatus()).isEqualTo("VOICE_APPROVED");
        assertThat(vo.getVoiceIntroUrl()).isEqualTo("https://cdn.example.com/voice.m4a");
        assertThat(vo.getVoiceIntroDuration()).isEqualTo(18);
        assertThat(vo.getVisibleToPublic()).isTrue();
        verify(voiceIntroRecordDao).insert(argThat(record ->
                "VOICE_APPROVED".equals(record.getAuditStatus())
                        && Boolean.TRUE.equals(record.getCurrentEffective())));
        verify(externalProviderTaskDao).insert(argThat(task ->
                "AUDIO_SAFETY".equals(task.getProviderType())
                        && Integer.valueOf(1).equals(task.getMocked())));
        verify(appUserDao).updateById(argThat(updated ->
                "https://cdn.example.com/voice.m4a".equals(updated.getVoiceIntroUrl())
                        && Integer.valueOf(18).equals(updated.getVoiceIntroDuration())
                        && "VOICE_APPROVED".equals(updated.getVoiceIntroAuditStatus())));
    }

    @Test
    @DisplayName("Provider 不可用时保持 VOICE_PENDING，不能对外展示新语音")
    void shouldKeepVoicePendingWhenProviderUnavailable() {
        when(audioSafetyProvider.check("https://cdn.example.com/pending.m4a", 20))
                .thenThrow(new BusinessException("音频安全 Provider 不可用"));

        var vo = service.submitVoiceIntro(1L, request("https://cdn.example.com/pending.m4a", 20));

        assertThat(vo.getVoiceIntroAuditStatus()).isEqualTo("VOICE_PENDING");
        assertThat(vo.getVoiceIntroUrl()).isNull();
        assertThat(vo.getVisibleToPublic()).isFalse();
        verify(voiceIntroRecordDao).insert(argThat(record ->
                "VOICE_PENDING".equals(record.getAuditStatus())
                        && !Boolean.TRUE.equals(record.getCurrentEffective())));
        verify(appUserDao, never()).updateById(argThat(updated ->
                "https://cdn.example.com/pending.m4a".equals(updated.getVoiceIntroUrl())));
    }

    @Test
    @DisplayName("语音时长必须在 10-60 秒")
    void shouldRejectInvalidVoiceDuration() {
        assertThatThrownBy(() -> service.submitVoiceIntro(1L, request("https://cdn.example.com/short.m4a", 9)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("VOICE_DURATION_INVALID")
                .hasMessageContaining("10-60");
    }

    private VoiceIntroSubmitReq request(String voiceUrl, int duration) {
        VoiceIntroSubmitReq req = new VoiceIntroSubmitReq();
        req.setVoiceUrl(voiceUrl);
        req.setDuration(duration);
        return req;
    }
}
