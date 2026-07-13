package com.spacetime.miniapp.controller;

import com.spacetime.common.exception.GlobalExceptionHandler;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.miniapp.dto.response.BasicProfileVO;
import com.spacetime.miniapp.service.OpenTextAuditService;
import com.spacetime.miniapp.service.ProfileMediaService;
import com.spacetime.miniapp.service.ProfileService;
import com.spacetime.miniapp.service.VoiceIntroService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("移动端基础资料接口")
class ProfileControllerBasicProfileTest {

    @Mock
    private ProfileService profileService;
    @Mock
    private OpenTextAuditService openTextAuditService;
    @Mock
    private VoiceIntroService voiceIntroService;
    @Mock
    private ProfileMediaService profileMediaService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        UserContextHolder.set(new UserContext(7L, "林晓雨", List.of(), List.of()));
        mockMvc = MockMvcBuilders.standaloneSetup(new ProfileController(
                        profileService, openTextAuditService, voiceIntroService, profileMediaService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @AfterEach
    void tearDown() {
        UserContextHolder.clear();
    }

    @Test
    @DisplayName("查询当前用户基础资料")
    void shouldGetBasicProfile() throws Exception {
        BasicProfileVO vo = new BasicProfileVO();
        vo.setUserId(7L);
        vo.setNickname("林晓雨");
        when(profileService.getBasicProfile(7L)).thenReturn(vo);

        mockMvc.perform(get("/miniapp/profile/basic"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.userId").value(7))
                .andExpect(jsonPath("$.data.nickname").value("林晓雨"));
    }

    @Test
    @DisplayName("保存当前用户基础资料")
    void shouldSaveBasicProfile() throws Exception {
        BasicProfileVO vo = new BasicProfileVO();
        vo.setUserId(7L);
        vo.setNickname("林晓雨");
        when(profileService.saveBasicProfile(org.mockito.ArgumentMatchers.eq(7L), any())).thenReturn(vo);

        mockMvc.perform(put("/miniapp/profile/basic")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nickname\":\"林晓雨\",\"gender\":\"FEMALE\",\"identity\":\"WORKER\",\"industry\":\"INTERNET\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.nickname").value("林晓雨"));
        verify(profileService).saveBasicProfile(org.mockito.ArgumentMatchers.eq(7L),
                org.mockito.ArgumentMatchers.argThat(req -> "FEMALE".equals(req.getGender())
                        && "INTERNET".equals(req.getIndustry())));
    }
}
