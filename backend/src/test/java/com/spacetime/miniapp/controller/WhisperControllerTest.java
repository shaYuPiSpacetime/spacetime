package com.spacetime.miniapp.controller;

import com.spacetime.common.exception.GlobalExceptionHandler;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.miniapp.dto.response.WhisperCreateVO;
import com.spacetime.miniapp.dto.response.WhisperPrecheckVO;
import com.spacetime.miniapp.service.WhisperService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 悄悄话预检查和创建接口必须透传登录用户与幂等键。 */
@ExtendWith(MockitoExtension.class)
class WhisperControllerTest {
    @Mock private WhisperService whisperService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        UserContextHolder.set(new UserContext(7L, "移动端用户", List.of(), List.of()));
        mockMvc = MockMvcBuilders.standaloneSetup(new WhisperController(whisperService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @AfterEach
    void tearDown() {
        UserContextHolder.clear();
    }

    @Test
    void exposesPrecheckAndCreateRoutes() throws Exception {
        WhisperPrecheckVO precheck = new WhisperPrecheckVO();
        precheck.setAllowed(true);
        precheck.setCoinAmount(12);
        precheck.setCoinBalance(50);
        precheck.setContentMaxLength(60);
        when(whisperService.precheck(eq(7L), any())).thenReturn(precheck);

        WhisperCreateVO created = new WhisperCreateVO();
        created.setWhisperNo("WSP-001");
        created.setCoinCost(12);
        created.setCoinBalance(38);
        when(whisperService.create(eq(7L), eq("idem-001"), any())).thenReturn(created);

        String body = """
                {"targetUserNo":"USR-000000000008","sourcePostNo":"POST-001","scene":"community_post"}
                """;
        mockMvc.perform(post("/miniapp/message/whispers/precheck")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.allowed").value(true))
                .andExpect(jsonPath("$.data.coinAmount").value(12));

        mockMvc.perform(post("/miniapp/message/whispers")
                        .header("Idempotency-Key", "idem-001")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"targetUserNo":"USR-000000000008","sourcePostNo":"POST-001",\
                                 "scene":"community_post","content":"想认识你，可以聊聊吗？"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.whisperNo").value("WSP-001"))
                .andExpect(jsonPath("$.data.coinBalance").value(38));
    }

    @Test
    void createRequiresIdempotencyKeyHeader() throws Exception {
        mockMvc.perform(post("/miniapp/message/whispers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"targetUserNo":"USR-000000000008","sourcePostNo":"POST-001",\
                                 "scene":"community_post","content":"你好"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(4001))
                .andExpect(jsonPath("$.msg").value(org.hamcrest.Matchers.containsString("幂等键")));

        verify(whisperService, never()).create(any(), any(), any());
    }
}
