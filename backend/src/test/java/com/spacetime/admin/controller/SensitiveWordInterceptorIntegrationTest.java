package com.spacetime.admin.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.admin.service.SensitiveWordService;
import com.spacetime.common.constant.AuthConstant;
import com.spacetime.common.dao.MenuDao;
import com.spacetime.common.interceptor.*;
import com.spacetime.common.service.MiniappPresenceService;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.data.redis.core.*;
import org.springframework.http.HttpMethod;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.util.List;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** L2-06: the actual token and permission chain, with isolated session storage. */
class SensitiveWordInterceptorIntegrationTest {
    private final SensitiveWordService service = mock(SensitiveWordService.class);
    private final StringRedisTemplate redis = mock(StringRedisTemplate.class);
    private final MenuDao menus = mock(MenuDao.class);
    private final MiniappPresenceService presence = mock(MiniappPresenceService.class);
    private MockMvc mvc;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setup() throws Exception {
        UserContextHolder.clear();
        ObjectMapper mapper = new ObjectMapper();
        String session = mapper.writeValueAsString(new UserContext(71L, "test", List.of(), List.of()));
        ValueOperations<String, String> sessions = mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(sessions);
        when(sessions.get(AuthConstant.ADMIN_TOKEN_PREFIX + "admin-test")).thenReturn(session);
        when(sessions.get(AuthConstant.MINIAPP_TOKEN_PREFIX + "mini-test")).thenReturn(session);
        mvc = MockMvcBuilders.standaloneSetup(new SensitiveWordController(service))
                .addInterceptors(new TokenInterceptor(redis, mapper, presence), new PermissionInterceptor(menus))
                .build();
    }

    @AfterEach void clear() { UserContextHolder.clear(); }

    @ParameterizedTest
    @CsvSource({"GET,,list", "GET,/categories,list", "GET,/2,list", "POST,,add",
            "PUT,/2,edit", "PATCH,/2/status,edit", "DELETE,/2,delete"})
    void everyRouteRequiresAdminSessionAndItsExactPermission(String method, String suffix, String permission) throws Exception {
        mvc.perform(route(method, suffix)).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value(401));
        mvc.perform(route(method, suffix).header(AuthConstant.TOKEN_HEADER, "mini-test"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value(401));
        verifyNoInteractions(service, menus, presence);

        // A legitimate admin session with every OTHER permission must still be refused.
        when(menus.selectPermsByUserId(71L)).thenReturn(List.of("list", "add", "edit", "delete").stream()
                .filter(p -> !p.equals(permission)).map(p -> "sensitive-word:" + p).toList());
        mvc.perform(route(method, suffix).header(AuthConstant.TOKEN_HEADER, "admin-test"))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value(403));
        verifyNoInteractions(service);
        assertThat(UserContextHolder.get()).isNull();

        when(menus.selectPermsByUserId(71L)).thenReturn(List.of("sensitive-word:" + permission));
        mvc.perform(route(method, suffix).header(AuthConstant.TOKEN_HEADER, "admin-test"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.code").value(200));
        assertThat(mockingDetails(service).getInvocations()).hasSize(1);
        assertThat(UserContextHolder.get()).isNull();
        verifyNoInteractions(presence);
    }

    private MockHttpServletRequestBuilder route(String method, String suffix) {
        return request(HttpMethod.valueOf(method), "/admin/sensitive-words" + (suffix == null ? "" : suffix))
                .contentType("application/json")
                .content("{\"word\":\"matrix\",\"categoryCode\":\"OTHER\",\"status\":\"ENABLED\"}");
    }
}
