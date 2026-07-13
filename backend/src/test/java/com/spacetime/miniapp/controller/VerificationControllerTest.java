package com.spacetime.miniapp.controller;

import com.spacetime.common.exception.GlobalExceptionHandler;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.miniapp.dto.response.VerificationStatusVO;
import com.spacetime.miniapp.service.VerificationService;
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

import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 移动端三重认证接口契约测试。
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("移动端三重认证接口")
class VerificationControllerTest {

    @Mock
    private VerificationService verificationService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        UserContextHolder.set(new UserContext(7L, "测试用户", List.of(), List.of()));
        mockMvc = MockMvcBuilders.standaloneSetup(new VerificationController(verificationService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @AfterEach
    void tearDown() {
        UserContextHolder.clear();
    }

    @Test
    @DisplayName("实名认证使用正式字段名提交")
    void shouldSubmitRealNameWithFormalFieldNames() throws Exception {
        VerificationStatusVO vo = new VerificationStatusVO();
        vo.setRealNameStatus("PENDING");
        when(verificationService.submitRealName(eq(7L), org.mockito.ArgumentMatchers.any())).thenReturn(vo);

        mockMvc.perform(post("/miniapp/verify/real-name")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "realName": "张三",
                                  "idCardNo": "110101199001011234",
                                  "singleCommitmentChecked": true
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.realNameStatus").value("PENDING"));

        verify(verificationService).submitRealName(eq(7L), argThat(req ->
                "110101199001011234".equals(req.getIdCardNo())
                        && Boolean.TRUE.equals(req.getSingleCommitmentChecked())));
    }

    @Test
    @DisplayName("学历材料按一次认证提交完整快照")
    void shouldSubmitEducationSnapshot() throws Exception {
        VerificationStatusVO vo = new VerificationStatusVO();
        vo.setEducationStatus("PENDING");
        when(verificationService.submitEducation(eq(7L), org.mockito.ArgumentMatchers.any())).thenReturn(vo);

        mockMvc.perform(post("/miniapp/verify/education")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "educationUserType": "STUDENT",
                                  "educationMethod": "STUDENT_CARD",
                                  "schoolName": "浙江大学",
                                  "educationLevel": "BACHELOR",
                                  "materialUrls": ["https://static.example.com/student-card.jpg"],
                                  "educationAgreementChecked": true
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.educationStatus").value("PENDING"));

        verify(verificationService).submitEducation(eq(7L), argThat(req ->
                "STUDENT_CARD".equals(req.getEducationMethod())
                        && req.getMaterialUrls().size() == 1));
    }

    @Test
    @DisplayName("旧版头像确认接口不再对外提供")
    void shouldNotExposeLegacyAvatarVerifyEndpoint() throws Exception {
        mockMvc.perform(post("/miniapp/verify/avatar")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"mediaId\":101}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(404));
    }
}
