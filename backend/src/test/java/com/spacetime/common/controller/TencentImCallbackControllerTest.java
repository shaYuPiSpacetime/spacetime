package com.spacetime.common.controller;

import com.spacetime.common.model.message.TencentImCallbackRequest;
import com.spacetime.common.model.message.TencentImCallbackResponse;
import com.spacetime.common.service.TencentImCallbackService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class TencentImCallbackControllerTest {

    @Mock private TencentImCallbackService callbackService;

    @Test
    void shouldReturnTencentProtocolResponseInsteadOfCommonEnvelope() throws Exception {
        when(callbackService.handle(any())).thenReturn(TencentImCallbackResponse.ok());
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(
                new TencentImCallbackController(callbackService)).build();

        mockMvc.perform(post("/internal/tencent-im/callback/path-token")
                        .queryParam("SdkAppid", "1400000001")
                        .queryParam("CallbackCommand", "C2C.CallbackAfterSendMsg")
                        .queryParam("RequestTime", "1786334400")
                        .queryParam("Sign", "signature")
                        .queryParam("OptPlatform", "RESTAPI")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"CallbackCommand\":\"C2C.CallbackAfterSendMsg\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ActionStatus").value("OK"))
                .andExpect(jsonPath("$.ErrorCode").value(0))
                .andExpect(jsonPath("$.ErrorInfo").value("OK"))
                .andExpect(jsonPath("$.code").doesNotExist());

        ArgumentCaptor<TencentImCallbackRequest> captor =
                ArgumentCaptor.forClass(TencentImCallbackRequest.class);
        verify(callbackService).handle(captor.capture());
        assertThat(captor.getValue().callbackPathToken()).isEqualTo("path-token");
        assertThat(captor.getValue().sdkAppId()).isEqualTo(1400000001L);
        assertThat(captor.getValue().callbackCommand()).isEqualTo("C2C.CallbackAfterSendMsg");
        assertThat(captor.getValue().optPlatform()).isEqualTo("RESTAPI");
    }
}
