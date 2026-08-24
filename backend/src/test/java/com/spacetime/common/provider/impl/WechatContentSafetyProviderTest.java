package com.spacetime.common.provider.impl;

import com.spacetime.common.community.CommunityContentSecurityPort;
import com.spacetime.common.community.CommunitySecurityResult;
import com.spacetime.common.provider.ProviderCheckResult;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WechatContentSafetyProviderTest {

    @Mock
    private CommunityContentSecurityPort contentSecurityPort;

    @Test
    void textPass_shouldMapToSafeResult() {
        when(contentSecurityPort.checkText("openid-1", "认真认识一个人", "profile"))
                .thenReturn(CommunitySecurityResult.pass("0"));

        ProviderCheckResult result = new WechatTextSafetyProvider(contentSecurityPort)
                .check("openid-1", "ABOUT_ME", "认真认识一个人");

        assertThat(result.getSafe()).isTrue();
        assertThat(result.getMocked()).isFalse();
        assertThat(result.getProviderCode()).isEqualTo("wechat-content-security");
        assertThat(result.getExternalTaskId()).isNull();
    }

    @Test
    void textRisky_shouldMapToUnsafeResult() {
        when(contentSecurityPort.checkText("openid-1", "违规文本", "profile"))
                .thenReturn(CommunitySecurityResult.reject("100", "wechat_risky"));

        ProviderCheckResult result = new WechatTextSafetyProvider(contentSecurityPort)
                .check("openid-1", "ABOUT_ME", "违规文本");

        assertThat(result.getSafe()).isFalse();
        assertThat(result.getRejectReason()).isEqualTo("wechat_risky");
    }

    @Test
    void textReview_shouldRemainPendingForManualReview() {
        when(contentSecurityPort.checkText("openid-1", "待复核文本", "profile"))
                .thenReturn(CommunitySecurityResult.review("wechat_review:200"));

        ProviderCheckResult result = new WechatTextSafetyProvider(contentSecurityPort)
                .check("openid-1", "ABOUT_ME", "待复核文本");

        assertThat(result.getSafe()).isNull();
        assertThat(result.getRejectReason()).isEqualTo("wechat_review:200");
        assertThat(result.getExternalTaskId()).isNull();
    }

    @Test
    void imageAccepted_shouldReturnWechatTraceId() {
        when(contentSecurityPort.checkImages("openid-1", java.util.List.of("https://img.example/a.jpg"), "profile"))
                .thenReturn(CommunitySecurityResult.asyncReview("trace-image-1"));

        ProviderCheckResult result = new WechatImageSafetyProvider(contentSecurityPort)
                .check("openid-1", "AVATAR", "https://img.example/a.jpg", null);

        assertThat(result.getSafe()).isNull();
        assertThat(result.getExternalTaskId()).isEqualTo("trace-image-1");
        assertThat(result.getProviderCode()).isEqualTo("wechat-content-security");
    }

    @Test
    void audioAccepted_shouldReturnWechatTraceId() {
        when(contentSecurityPort.checkAudio("openid-1", "https://audio.example/a.mp3", "profile"))
                .thenReturn(CommunitySecurityResult.asyncReview("trace-audio-1"));

        ProviderCheckResult result = new WechatAudioSafetyProvider(contentSecurityPort)
                .check("openid-1", "https://audio.example/a.mp3", 20);

        assertThat(result.getSafe()).isNull();
        assertThat(result.getExternalTaskId()).isEqualTo("trace-audio-1");
        assertThat(result.getProviderCode()).isEqualTo("wechat-content-security");
    }
}
