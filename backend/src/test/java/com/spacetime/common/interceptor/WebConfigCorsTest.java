package com.spacetime.common.interceptor;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.admin.controller.SensitiveWordController;
import com.spacetime.admin.service.SensitiveWordService;
import com.spacetime.common.constant.AuthConstant;
import com.spacetime.common.dao.MenuDao;
import com.spacetime.common.service.MiniappPresenceService;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.context.annotation.*;
import org.springframework.data.redis.core.*;
import org.springframework.mock.web.MockServletContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import java.util.List;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** FIX-01/02: exercise actual WebConfig CORS and interceptors, not standalone MVC defaults. */
class WebConfigCorsTest {
    private AnnotationConfigWebApplicationContext context;
    private MockMvc mvc;
    private MenuDao menus;
    private SensitiveWordService service;
    @Configuration @EnableWebMvc @Import(WebConfig.class)
    static class Config {
        @Bean MenuDao menus() { return mock(MenuDao.class); }
        @Bean SensitiveWordService service() { return mock(SensitiveWordService.class); }
        @Bean SensitiveWordController controller(SensitiveWordService s) { return new SensitiveWordController(s); }
        @Bean PermissionInterceptor permissionInterceptor(MenuDao m) { return new PermissionInterceptor(m); }
        @Bean @SuppressWarnings("unchecked") TokenInterceptor tokenInterceptor() throws Exception {
            StringRedisTemplate redis=mock(StringRedisTemplate.class);
            ValueOperations<String,String> values=mock(ValueOperations.class);
            when(redis.opsForValue()).thenReturn(values);
            ObjectMapper mapper=new ObjectMapper();
            when(values.get(AuthConstant.ADMIN_TOKEN_PREFIX+"test-admin"))
                .thenReturn(mapper.writeValueAsString(new UserContext(71L,"test",List.of(),List.of())));
            return new TokenInterceptor(redis,mapper,mock(MiniappPresenceService.class));
        }
    }
    @BeforeEach void setup() {
        context=new AnnotationConfigWebApplicationContext();
        context.setServletContext(new MockServletContext());
        context.register(Config.class);context.refresh();
        menus=context.getBean(MenuDao.class);service=context.getBean(SensitiveWordService.class);
        mvc=MockMvcBuilders.webAppContextSetup(context).build();
    }
    @AfterEach void close() { UserContextHolder.clear();context.close(); }
    @ParameterizedTest @ValueSource(strings={"http://127.0.0.1:5173","http://localhost:5173","https://admin.shikongxiehou.com"})
    void allowedOriginsCanPreflightPatch(String origin) throws Exception {
        mvc.perform(options("/admin/sensitive-words/2/status").header("Origin",origin)
            .header("Access-Control-Request-Method","PATCH").header("Access-Control-Request-Headers","content-type,x-auth-token"))
            .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin",origin))
            .andExpect(header().string("Access-Control-Allow-Methods",containsString("PATCH")));
        verifyNoInteractions(service,menus);
    }
    @Test void patchStillRequiresSessionAndEditPermission() throws Exception {
        mvc.perform(patchRequest()).andExpect(status().isUnauthorized());
        when(menus.selectPermsByUserId(71L)).thenReturn(List.of("sensitive-word:list"));
        mvc.perform(patchRequest().header(AuthConstant.TOKEN_HEADER,"test-admin"))
            .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value(403));
        verifyNoInteractions(service);
        when(menus.selectPermsByUserId(71L)).thenReturn(List.of("sensitive-word:edit"));
        mvc.perform(patchRequest().header(AuthConstant.TOKEN_HEADER,"test-admin"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.code").value(200));
        verify(service).changeStatus(2L,"DISABLED");
    }
    @Test void unrelatedEndpointsDoNotGainCrossOriginPatch() throws Exception {
        mvc.perform(options("/admin/sensitive-words/2").header("Origin","http://127.0.0.1:5173")
            .header("Access-Control-Request-Method","PATCH")).andExpect(status().isForbidden());
        verifyNoInteractions(service,menus);
    }
    @Test void untrustedOriginRemainsForbidden() throws Exception {
        mvc.perform(options("/admin/sensitive-words/2/status").header("Origin","https://untrusted.invalid")
            .header("Access-Control-Request-Method","PATCH")).andExpect(status().isForbidden());
        verifyNoInteractions(service,menus);
    }
    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder patchRequest() {
        return patch("/admin/sensitive-words/2/status").header("Origin","http://127.0.0.1:5173")
            .contentType("application/json").content("{\"status\":\"DISABLED\"}");
    }
}
