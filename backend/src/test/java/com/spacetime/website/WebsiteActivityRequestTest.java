package com.spacetime.website;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.config.JacksonConfig;
import com.spacetime.common.exception.GlobalExceptionHandler;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.website.controller.WebsiteController;
import com.spacetime.website.service.WebsiteService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class WebsiteActivityRequestTest {
    private WebsiteService service;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        service = mock(WebsiteService.class);
        Jackson2ObjectMapperBuilder builder = new Jackson2ObjectMapperBuilder();
        new JacksonConfig().jackson2ObjectMapperBuilderCustomizer().customize(builder);
        ObjectMapper mapper = builder.build();
        mvc = MockMvcBuilders.standaloneSetup(new WebsiteController(service))
                .setMessageConverters(new MappingJackson2HttpMessageConverter(mapper))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
        UserContextHolder.set(new UserContext(42L, "测试用户", List.of(), List.of()));
    }

    @AfterEach
    void tearDown() {
        UserContextHolder.clear();
    }

    @ParameterizedTest
    @ValueSource(strings = {"2026-09-28T13:29", "2026-09-28 13:29:00"})
    void 新旧页面的时间格式都能进入活动发布服务(String startTime) throws Exception {
        mvc.perform(post("/website/activities")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(startTime)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        ArgumentCaptor<WebsiteService.ActivityCreateRequest> request =
                ArgumentCaptor.forClass(WebsiteService.ActivityCreateRequest.class);
        verify(service).publish(eq(42L), request.capture());
        assertEquals(LocalDateTime.of(2026, 9, 28, 13, 29), request.getValue().startTime());
    }

    @Test
    void 无效活动时间返回可理解的业务错误() throws Exception {
        mvc.perform(post("/website/activities")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("invalid")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.msg").value("活动时间格式不正确，请重新选择"));
    }

    private static String body(String startTime) {
        return """
                {"title":"校园骑行","content":"周末集合骑行","startTime":"%s",
                 "location":"大学城南门","estimatedCost":0,"imageIds":[1]}
                """.formatted(startTime);
    }
}
