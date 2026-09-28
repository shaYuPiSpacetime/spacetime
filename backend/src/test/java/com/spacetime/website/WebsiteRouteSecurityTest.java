package com.spacetime.website;

import com.spacetime.admin.controller.WebsiteAdminController;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.website.WebsiteRequestInfo;
import com.spacetime.website.auth.WebsiteSessionInterceptor;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import jakarta.servlet.http.Cookie;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class WebsiteRouteSecurityTest {
    @Test void 公开活动图片与私聊图片采用不同登录边界() throws Exception {
        WebsiteSessionInterceptor interceptor = new WebsiteSessionInterceptor(mock(StringRedisTemplate.class));
        MockHttpServletRequest publicRequest = new MockHttpServletRequest("GET", "/website/public-media/5");
        assertTrue(interceptor.preHandle(publicRequest, new MockHttpServletResponse(), new Object()));
        MockHttpServletResponse privateResponse = new MockHttpServletResponse();
        MockHttpServletRequest privateRequest = new MockHttpServletRequest("GET", "/website/private-media/5");
        assertFalse(interceptor.preHandle(privateRequest, privateResponse, new Object()));
        assertEquals(401, privateResponse.getStatus());
    }

    @Test void 管理端查看聊天正文与导出分别需要独立权限() throws Exception {
        RequirePermission view = WebsiteAdminController.class.getMethod("viewMessage", Long.class,
                WebsiteAdminController.ReasonRequest.class).getAnnotation(RequirePermission.class);
        RequirePermission export = WebsiteAdminController.class.getMethod("exportMessages",
                WebsiteAdminController.ReasonRequest.class).getAnnotation(RequirePermission.class);
        assertNotNull(view);
        assertNotNull(export);
        assertEquals("website:message:content", view.value());
        assertEquals("website:message:export", export.value());
    }

    @Test void 已登录网站用户写操作必须携带正确来源与防跨站令牌() throws Exception {
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        @SuppressWarnings("unchecked")
        ValueOperations<String, String> values = mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(values);
        String token = "a".repeat(32);
        String csrf = "b".repeat(32);
        when(values.get(WebsiteSessionInterceptor.REDIS_PREFIX + token)).thenReturn("1|" + csrf);
        WebsiteSessionInterceptor interceptor = new WebsiteSessionInterceptor(redis);
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/website/activities");
        request.setCookies(new Cookie(WebsiteSessionInterceptor.COOKIE_NAME, token));
        request.addHeader("Origin", "https://www.shikongxiehou.com");
        request.setServerName("www.shikongxiehou.com");
        MockHttpServletResponse rejected = new MockHttpServletResponse();
        assertFalse(interceptor.preHandle(request, rejected, new Object()));
        assertEquals(403, rejected.getStatus());
        request.addHeader("X-CSRF-Token", csrf);
        assertTrue(interceptor.preHandle(request, new MockHttpServletResponse(), new Object()));
        interceptor.afterCompletion(request, new MockHttpServletResponse(), new Object(), null);
    }

    @Test void 审计日志记录网关提供的真实客户端地址() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("172.18.0.2");
        request.addHeader("X-Real-IP", "203.0.113.9");
        assertEquals("203.0.113.9", WebsiteRequestInfo.clientIp(request));
    }
}
