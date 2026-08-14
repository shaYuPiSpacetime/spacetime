package com.spacetime.admin.controller;

import com.spacetime.admin.dto.request.SensitiveContentViewReq;
import com.spacetime.admin.dto.response.SensitiveContentVO;
import com.spacetime.admin.dto.response.AdminSensitiveMessageContentVO;
import com.spacetime.admin.service.MessageRecordAdminService;
import com.spacetime.admin.service.MessageReportEvidenceAdminService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.result.R;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import java.lang.reflect.Method;
import java.lang.reflect.ParameterizedType;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("PRD-03 管理后台消息 Controller 契约")
class MessageAdminControllerContractTest {

    @Test
    @DisplayName("消息记录、配置和模板接口应绑定正式权限码")
    void messageAdminRoutesShouldUseSpecifiedPermissions() {
        assertThat(MessageAdminController.class.getAnnotation(RequestMapping.class).value())
                .containsExactly("/admin/message");
        assertEndpoint(MessageAdminController.class, "recordStats", "GET", "/records/stats",
                "message:record:list");
        assertEndpoint(MessageAdminController.class, "records", "GET", "/records",
                "message:record:list");
        assertEndpoint(MessageAdminController.class, "recordDetail", "GET", "/records/{recordNo}",
                "message:record:list");
        assertEndpoint(MessageAdminController.class, "recordContentView", "POST",
                "/records/{recordNo}/content-view", "message:sensitive-content:view");
        assertEndpoint(MessageAdminController.class, "exportRecords", "POST", "/records/export",
                "message:record:export");
        assertEndpoint(MessageAdminController.class, "config", "GET", "/config",
                "message:config:view");
        assertEndpoint(MessageAdminController.class, "publishConfig", "POST", "/config/versions",
                "message:config:edit");
        assertEndpoint(MessageAdminController.class, "globalSend", "POST",
                "/config/runtime/global-send", "message:config:edit");
        assertEndpoint(MessageAdminController.class, "configLogs", "GET", "/config/logs",
                "message:config:view");
        assertEndpoint(MessageAdminController.class, "templates", "GET", "/templates",
                "message:template:view");
        assertEndpoint(MessageAdminController.class, "publishTemplate", "POST",
                "/templates/{templateCode}/versions", "message:template:edit");
    }

    @Test
    @DisplayName("消息记录高敏正文接口应禁止响应缓存")
    void recordContentRouteShouldBeNonCacheable() {
        MessageRecordAdminService recordService = mock(MessageRecordAdminService.class);
        SensitiveContentViewReq req = new SensitiveContentViewReq();
        req.setViewReason("核查用户投诉中的消息内容");
        req.setRequestId("REQ-RECORD-001");
        when(recordService.viewContent("MSG-001", req))
                .thenReturn(new AdminSensitiveMessageContentVO("ACC-001", "private_message",
                        "MSG-001", List.of()));
        MockHttpServletResponse response = new MockHttpServletResponse();

        new MessageAdminController(mock(com.spacetime.admin.service.MessageConfigAdminService.class),
                recordService).recordContentView("MSG-001", req, response);

        assertThat(response.getHeader("Cache-Control"))
                .isEqualTo("no-store, no-cache, must-revalidate, max-age=0");
        assertThat(response.getHeader("Pragma")).isEqualTo("no-cache");
    }

    @Test
    @DisplayName("App 用户消息接口应按数据类型拆分权限")
    void appUserMessageRoutesShouldUseSpecifiedPermissions() {
        assertThat(AppUserMessageAdminController.class.getAnnotation(RequestMapping.class).value())
                .containsExactly("/admin/users/app");
        assertEndpoint(AppUserMessageAdminController.class, "summary", "GET",
                "/{userId}/messages/summary", "message:summary:view");
        assertEndpoint(AppUserMessageAdminController.class, "conversations", "GET",
                "/{userId}/messages/conversations", "message:conversation:list");
        assertEndpoint(AppUserMessageAdminController.class, "privateMessages", "GET",
                "/{userId}/messages/private-messages", "message:conversation:list");
        assertEndpoint(AppUserMessageAdminController.class, "whispers", "GET",
                "/{userId}/messages/whispers", "message:whisper:list");
        assertEndpoint(AppUserMessageAdminController.class, "systemMessages", "GET",
                "/{userId}/messages/system-messages", "message:system:list");
        assertEndpoint(AppUserMessageAdminController.class, "platformMessages", "GET",
                "/{userId}/messages/platform-messages", "message:system:list");
        assertEndpoint(AppUserMessageAdminController.class, "reports", "GET",
                "/{userId}/messages/reports", "community:report:list");
        assertEndpoint(AppUserMessageAdminController.class, "viewPrivateMessageContent", "POST",
                "/{userId}/messages/private-messages/{messageNo}/content-view",
                "message:sensitive-content:view");
        assertEndpoint(AppUserMessageAdminController.class, "viewWhisperContent", "POST",
                "/{userId}/messages/whispers/{whisperNo}/content-view",
                "message:sensitive-content:view");
    }

    @Test
    @DisplayName("举报证据正文接口应使用独立权限并禁止响应缓存")
    void evidenceContentRouteShouldBeProtectedAndNonCacheable() {
        assertThat(MessageReportEvidenceAdminController.class.getAnnotation(RequestMapping.class).value())
                .containsExactly("/admin/community/reports");
        assertEndpoint(MessageReportEvidenceAdminController.class, "evidence", "GET",
                "/{reportNo}/evidence", "community:report:list");
        assertEndpoint(MessageReportEvidenceAdminController.class, "contentView", "POST",
                "/{reportNo}/evidence/{evidenceNo}/content-view", "message:report-context:view");

        MessageReportEvidenceAdminService service = mock(MessageReportEvidenceAdminService.class);
        SensitiveContentViewReq req = new SensitiveContentViewReq();
        req.setViewReason("核查用户举报中的骚扰内容");
        req.setRequestId("REQ-CONTROLLER-001");
        when(service.viewContent("RPT-001", "EVD-001", req))
                .thenReturn(new SensitiveContentVO(
                        "ACC-001", "EVD-001", "text", "证据正文", LocalDateTime.now()));
        MockHttpServletResponse response = new MockHttpServletResponse();

        new MessageReportEvidenceAdminController(service)
                .contentView("RPT-001", "EVD-001", req, response);

        assertThat(response.getHeader("Cache-Control"))
                .isEqualTo("no-store, no-cache, must-revalidate, max-age=0");
        assertThat(response.getHeader("Pragma")).isEqualTo("no-cache");
    }

    private void assertEndpoint(Class<?> controller, String methodName, String httpMethod,
                                String path, String permission) {
        Method method = List.of(controller.getDeclaredMethods()).stream()
                .filter(candidate -> candidate.getName().equals(methodName))
                .findFirst()
                .orElseThrow();
        RequirePermission annotation = method.getAnnotation(RequirePermission.class);
        assertThat(annotation).as(methodName + " permission").isNotNull();
        assertThat(annotation.value()).isEqualTo(permission);
        if ("GET".equals(httpMethod)) {
            assertThat(method.getAnnotation(GetMapping.class).value()).containsExactly(path);
        } else {
            assertThat(method.getAnnotation(PostMapping.class).value()).containsExactly(path);
        }
        assertThat(method.getGenericReturnType()).isInstanceOf(ParameterizedType.class);
        assertThat(((ParameterizedType) method.getGenericReturnType()).getRawType()).isEqualTo(R.class);
    }
}
