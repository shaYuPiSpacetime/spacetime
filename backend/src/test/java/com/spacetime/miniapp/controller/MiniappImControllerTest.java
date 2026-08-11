package com.spacetime.miniapp.controller;

import com.spacetime.common.exception.GlobalExceptionHandler;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.miniapp.dto.response.ImCredentialVO;
import com.spacetime.miniapp.service.MiniappImService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class MiniappImControllerTest {
    @Mock private MiniappImService imService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        UserContextHolder.set(new UserContext(7L, "移动端用户", List.of(), List.of()));
        mockMvc = MockMvcBuilders.standaloneSetup(new MiniappImController(imService))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    @AfterEach
    void tearDown() {
        UserContextHolder.clear();
    }

    @Test
    void shouldExposeCredentialRoute() throws Exception {
        ImCredentialVO vo = new ImCredentialVO();
        vo.setSdkAppId(1400000001L);
        vo.setImUserId("tu_random");
        vo.setUserSig("sig");
        vo.setExpireAt("2026-08-11 17:00:00");
        vo.setProtocolVersion(1);
        when(imService.credentials(7L)).thenReturn(vo);

        mockMvc.perform(get("/miniapp/im/credentials"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.sdkAppId").value(1400000001L))
                .andExpect(jsonPath("$.data.imUserId").value("tu_random"))
                .andExpect(jsonPath("$.data.userSig").value("sig"));
    }
}
