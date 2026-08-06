package com.spacetime.miniapp.controller;

import com.spacetime.common.exception.GlobalExceptionHandler;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.miniapp.dto.response.MeetingPreferenceVO;
import com.spacetime.miniapp.service.MeetingPreferenceService;
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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** PRD-08 见面偏好接口路由契约。 */
@ExtendWith(MockitoExtension.class)
class MeetingPreferenceControllerTest {
    @Mock private MeetingPreferenceService meetingPreferenceService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        UserContextHolder.set(new UserContext(7L, "移动端用户", List.of(), List.of()));
        mockMvc = MockMvcBuilders.standaloneSetup(
                        new MeetingPreferenceController(meetingPreferenceService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @AfterEach
    void tearDown() {
        UserContextHolder.clear();
    }

    @Test
    void exposesReadAndPageLevelSave() throws Exception {
        MeetingPreferenceVO current = new MeetingPreferenceVO();
        current.setMeetingPreference("NATURAL");
        current.setPreferredActivities(List.of("COFFEE"));
        MeetingPreferenceVO saved = new MeetingPreferenceVO();
        saved.setMeetingPreference("PLANNED");
        saved.setPreferredActivities(List.of("WALK", "MOVIE"));
        when(meetingPreferenceService.get(7L)).thenReturn(current);
        when(meetingPreferenceService.save(eq(7L), any())).thenReturn(saved);

        mockMvc.perform(get("/miniapp/recommend/meeting-preference"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.meetingPreference").value("NATURAL"));
        mockMvc.perform(put("/miniapp/recommend/meeting-preference")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"meetingPreference":"PLANNED",
                                 "preferredActivities":["WALK","MOVIE"]}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.meetingPreference").value("PLANNED"))
                .andExpect(jsonPath("$.data.preferredActivities[1]").value("MOVIE"));

        verify(meetingPreferenceService).save(eq(7L), any());
    }
}
