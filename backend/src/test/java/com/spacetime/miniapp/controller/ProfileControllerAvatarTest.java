package com.spacetime.miniapp.controller;

import com.spacetime.common.exception.GlobalExceptionHandler;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.miniapp.dto.response.AvatarSubmitVO;
import com.spacetime.miniapp.dto.response.IntroductionDetailVO;
import com.spacetime.miniapp.dto.response.OpenTextAuditVO;
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

import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 移动端添加头像接口契约测试。
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("移动端添加头像接口")
class ProfileControllerAvatarTest {

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
    @DisplayName("提交裁剪后的相册头像")
    void shouldSubmitCroppedAvatar() throws Exception {
        AvatarSubmitVO vo = new AvatarSubmitVO();
        vo.setAuditRecordId(101L);
        vo.setAuditStatus("PENDING");
        vo.setAuditSource("MACHINE");
        when(profileMediaService.submitAvatar(eq(7L), org.mockito.ArgumentMatchers.any())).thenReturn(vo);

        mockMvc.perform(post("/miniapp/profile/avatar")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "avatarSource": "ALBUM",
                                  "avatarUrl": "https://static.example.com/avatar/cropped.jpg",
                                  "thumbUrl": "https://static.example.com/avatar/cropped-thumb.jpg"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.auditRecordId").value(101))
                .andExpect(jsonPath("$.data.auditStatus").value("PENDING"))
                .andExpect(jsonPath("$.data.auditSource").value("MACHINE"));

        verify(profileMediaService).submitAvatar(eq(7L), argThat(req ->
                "ALBUM".equals(req.getAvatarSource())
                        && "https://static.example.com/avatar/cropped.jpg".equals(req.getAvatarUrl())));
    }

    @Test
    @DisplayName("提交20字以上自我介绍")
    void shouldSubmitIntroduction() throws Exception {
        OpenTextAuditVO vo = new OpenTextAuditVO();
        vo.setFieldName("ABOUT_ME");
        vo.setAuditStatus("PENDING");
        vo.setAuditSource("MACHINE");
        when(openTextAuditService.submitIntroduction(eq(7L), org.mockito.ArgumentMatchers.any())).thenReturn(vo);

        mockMvc.perform(post("/miniapp/profile/introduction")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "aboutMe": "我是一个认真真诚的人，平时喜欢阅读、徒步和做饭，也愿意倾听和分享生活。"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.fieldName").value("ABOUT_ME"))
                .andExpect(jsonPath("$.data.auditStatus").value("PENDING"));

        verify(openTextAuditService).submitIntroduction(eq(7L), argThat(req -> req.getAboutMe().length() >= 20));
    }

    @Test
    @DisplayName("查询自我介绍详情回显最新提交和生效内容")
    void shouldGetIntroductionDetail() throws Exception {
        IntroductionDetailVO vo = new IntroductionDetailVO();
        vo.setLatestContent("这是本人最新提交的自我介绍内容，正在审核中。");
        vo.setEffectiveContent("这是当前对外展示的旧版自我介绍内容。");
        vo.setAuditStatus("PENDING");
        vo.setCanSubmit(false);
        when(openTextAuditService.getIntroductionDetail(7L)).thenReturn(vo);

        mockMvc.perform(get("/miniapp/profile/introduction"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.latestContent").value("这是本人最新提交的自我介绍内容，正在审核中。"))
                .andExpect(jsonPath("$.data.effectiveContent").value("这是当前对外展示的旧版自我介绍内容。"))
                .andExpect(jsonPath("$.data.auditStatus").value("PENDING"))
                .andExpect(jsonPath("$.data.canSubmit").value(false));
    }
}
