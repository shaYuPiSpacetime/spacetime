package com.spacetime.miniapp.controller;

import com.spacetime.common.exception.GlobalExceptionHandler;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.miniapp.dto.request.RecommendPreferenceSaveReq;
import com.spacetime.miniapp.dto.request.RecommendViewActionReq;
import com.spacetime.miniapp.dto.response.RecommendCandidatePageVO;
import com.spacetime.miniapp.dto.response.RecommendPreferenceVO;
import com.spacetime.miniapp.dto.response.RecommendReplayPageVO;
import com.spacetime.miniapp.service.RecommendService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** PRD-08 推荐接口路由契约。 */
@ExtendWith(MockitoExtension.class)
class RecommendControllerTest {
    @Mock private RecommendService recommendService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        UserContextHolder.set(new UserContext(7L, "移动端用户", List.of(), List.of()));
        mockMvc = MockMvcBuilders.standaloneSetup(new RecommendController(recommendService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @AfterEach
    void tearDown() {
        UserContextHolder.clear();
    }

    @Test
    void exposesPreferenceReadAndSave() throws Exception {
        RecommendPreferenceVO current = new RecommendPreferenceVO();
        current.setVersion(2);
        RecommendPreferenceVO saved = new RecommendPreferenceVO();
        saved.setVersion(3);
        when(recommendService.getPreferences(7L)).thenReturn(current);
        when(recommendService.savePreferences(eq(7L), any())).thenReturn(saved);

        mockMvc.perform(get("/miniapp/recommend/preferences"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.version").value(2));
        mockMvc.perform(put("/miniapp/recommend/preferences")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"version":2,"targetCityCodes":["320100"],
                                 "allowNeighborCity":false,"minAge":24,"maxAge":34}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.version").value(3));

        ArgumentCaptor<RecommendPreferenceSaveReq> captor =
                ArgumentCaptor.forClass(RecommendPreferenceSaveReq.class);
        verify(recommendService).savePreferences(eq(7L), captor.capture());
        assertThat(captor.getValue().getTargetCityCodes()).containsExactly("320100");
    }

    @Test
    void exposesCandidatesAndReplay() throws Exception {
        RecommendCandidatePageVO candidates = new RecommendCandidatePageVO();
        candidates.setPreferenceVersion(4);
        RecommendReplayPageVO replay = new RecommendReplayPageVO();
        replay.setItems(List.of());
        when(recommendService.getCandidates(7L, "opaque-cursor")).thenReturn(candidates);
        when(recommendService.getReplay(7L)).thenReturn(replay);

        mockMvc.perform(get("/miniapp/recommend/candidates")
                        .param("cursor", "opaque-cursor"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.preferenceVersion").value(4));
        mockMvc.perform(get("/miniapp/recommend/replay"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items").isArray());
    }

    @Test
    void exposesViewSkipLikeAndNeverActions() throws Exception {
        String body = """
                {"requestId":"request-001","filterVersion":2,"position":1}
                """;

        for (String action : List.of("view", "skip", "like", "never")) {
            mockMvc.perform(post("/miniapp/recommend/candidates/8/" + action)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value(200));
            verify(recommendService).recordAction(eq(7L), eq("8"), eq(action),
                    any(RecommendViewActionReq.class));
        }
    }

    @Test
    void rejectsActionWithoutRequestIdBeforeCallingService() throws Exception {
        mockMvc.perform(post("/miniapp/recommend/candidates/8/view")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(4001));
    }
}
