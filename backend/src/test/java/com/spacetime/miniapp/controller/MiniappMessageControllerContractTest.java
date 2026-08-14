package com.spacetime.miniapp.controller;

import com.spacetime.common.result.R;
import com.spacetime.miniapp.dto.response.ImCredentialVO;
import com.spacetime.miniapp.dto.response.MessageConversationItemVO;
import com.spacetime.miniapp.dto.response.MessageHomeVO;
import com.spacetime.miniapp.dto.response.MessageUnreadSummaryVO;
import com.spacetime.miniapp.dto.response.MessageWhisperDetailVO;
import com.spacetime.miniapp.dto.response.MessageWhisperItemVO;
import com.spacetime.miniapp.dto.response.MessageWhisperActionsVO;
import com.spacetime.miniapp.dto.response.MessageWhisperPageVO;
import com.spacetime.miniapp.dto.response.WhisperCreateVO;
import com.spacetime.miniapp.dto.response.WhisperPrecheckVO;
import com.spacetime.miniapp.dto.response.WhisperReplyVO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.lang.reflect.ParameterizedType;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("PRD-03 小程序消息 Controller 契约")
class MiniappMessageControllerContractTest {

    @Test
    @DisplayName("消息业务 Controller 只公开业务状态接口并返回精确 R 泛型")
    void shouldExposeOnlyDocumentedBusinessRoutes() {
        assertThat(MiniappMessageController.class.getAnnotation(RequestMapping.class).value())
                .containsExactly("/miniapp/message");

        Map<String, String> expected = new LinkedHashMap<>();
        expected.put("GET /home", "home");
        expected.put("GET /unread-summary", "unreadSummary");
        expected.put("GET /whispers", "whispers");
        expected.put("GET /whispers/{whisperNo}", "whisperDetail");
        expected.put("POST /whispers/read-batch", "readWhispers");
        expected.put("DELETE /whispers/{whisperNo}", "hideWhisper");
        expected.put("POST /whispers/received/hide-all", "hideReceivedWhispers");
        expected.put("POST /whispers/{whisperNo}/reply", "replyWhisper");
        expected.put("GET /conversations", "conversations");
        expected.put("GET /conversations/{conversationNo}", "conversationDetail");
        expected.put("POST /conversations/{conversationNo}/read", "readConversation");
        expected.put("POST /conversations/{conversationNo}/block", "blockConversation");
        expected.put("GET /assistant/messages", "assistantMessages");
        expected.put("POST /assistant/messages/read-batch", "readAssistantMessages");
        expected.put("GET /system-messages", "systemMessages");
        expected.put("POST /system-messages/read-batch", "readSystemMessages");

        Map<String, String> actual = Arrays.stream(MiniappMessageController.class.getDeclaredMethods())
                .filter(method -> method.getAnnotation(GetMapping.class) != null
                        || method.getAnnotation(PostMapping.class) != null
                        || method.getAnnotation(DeleteMapping.class) != null)
                .collect(Collectors.toMap(this::routeOf, Method::getName,
                        (left, right) -> left, LinkedHashMap::new));

        assertThat(actual).containsExactlyInAnyOrderEntriesOf(expected);
        Arrays.stream(MiniappMessageController.class.getDeclaredMethods())
                .filter(method -> method.getAnnotation(GetMapping.class) != null
                        || method.getAnnotation(PostMapping.class) != null
                        || method.getAnnotation(DeleteMapping.class) != null)
                .forEach(this::assertPreciseResponse);
        assertThat(actual.keySet()).noneMatch(route -> route.contains("/messages")
                && !route.contains("assistant/messages")
                && !route.contains("system-messages"));
    }

    @Test
    @DisplayName("IM 凭证响应不得包含腾讯管理员密钥")
    void credentialResponseShouldNotExposeServerSecrets() {
        Set<String> fields = Arrays.stream(ImCredentialVO.class.getDeclaredFields())
                .map(Field::getName)
                .collect(Collectors.toSet());

        assertThat(fields).containsExactlyInAnyOrder(
                "sdkAppId", "imUserId", "userSig", "expireAt", "protocolVersion");
        assertThat(fields).doesNotContain("secretKey", "administratorUserSig",
                "callbackAuthToken", "callbackPathToken");
    }

    @Test
    @DisplayName("消息首页只返回列表渲染所需字段，不透出 TIM 和详情态权限")
    void messageHomeResponseShouldKeepLeanPlatformProjection() {
        assertThat(fieldNames(MessageHomeVO.class)).containsExactlyInAnyOrder(
                "accessMode", "restrictionPrompt", "unreadSummary", "whisperSummary",
                "likesMeSummary", "assistantSummary", "systemSummary", "conversationPage");
        assertThat(fieldNames(MessageUnreadSummaryVO.class)).containsExactlyInAnyOrder(
                "privateUnreadCount", "whisperUnreadCount", "assistantUnreadCount",
                "systemUnreadCount", "messageUnreadCount", "snapshotTime");
        assertThat(fieldNames(MessageConversationItemVO.class)).containsExactlyInAnyOrder(
                "conversationNo", "peerUser", "unreadCount", "lastMessage");
    }

    @Test
    @DisplayName("悄悄话移动端契约不暴露 TIM 原始编号和旧兼容字段")
    void whisperResponsesShouldExposeOnlyConfirmedFields() {
        assertThat(fieldNames(MessageWhisperItemVO.class)).containsExactlyInAnyOrder(
                "whisperNo", "direction", "status", "displayStatus", "peerUser",
                "payType", "createdTime", "expireTime", "canReply", "unread");
        assertThat(fieldNames(MessageWhisperDetailVO.class)).containsExactlyInAnyOrder(
                "whisperNo", "direction", "status", "displayStatus", "peerUser",
                "content", "contentAvailable", "requestMessageNo", "createdTime",
                "expireTime", "processedTime", "remainingSeconds", "conversationNo",
                "actions");
        assertThat(fieldNames(MessageWhisperPageVO.class)).containsExactlyInAnyOrder(
                "direction", "bucket", "totalCount", "list", "nextCursor", "hasMore");
        assertThat(fieldNames(MessageWhisperActionsVO.class)).containsExactlyInAnyOrder(
                "canReply", "canDelete", "canReportWhisperContent", "canReportPeerUser",
                "canReverseApply", "canEnterConversation", "canOpenProfile");
        assertThat(fieldNames(WhisperPrecheckVO.class)).doesNotContain("allowed", "targetAvatarUrl");
        assertThat(fieldNames(WhisperCreateVO.class)).containsExactlyInAnyOrder(
                "whisperNo", "sendStatus", "whisperStatus", "paymentStatus",
                "targetUserNo", "payType", "coinAmount", "coinBalance", "charged",
                "createdTime", "expireTime");
        assertThat(fieldNames(WhisperReplyVO.class)).containsExactlyInAnyOrder(
                "whisperNo", "status", "matchNo", "conversationNo", "replyMessageNo",
                "repliedTime");
    }

    private Set<String> fieldNames(Class<?> type) {
        return Arrays.stream(type.getDeclaredFields())
                .map(Field::getName)
                .collect(Collectors.toSet());
    }

    private String routeOf(Method method) {
        GetMapping get = method.getAnnotation(GetMapping.class);
        if (get != null) {
            return "GET " + singlePath(get.value());
        }
        PostMapping post = method.getAnnotation(PostMapping.class);
        if (post != null) {
            return "POST " + singlePath(post.value());
        }
        DeleteMapping delete = method.getAnnotation(DeleteMapping.class);
        return "DELETE " + singlePath(delete.value());
    }

    private String singlePath(String[] paths) {
        assertThat(paths).hasSize(1);
        return paths[0];
    }

    private void assertPreciseResponse(Method method) {
        assertThat(method.getGenericReturnType())
                .as(method.getName() + " response")
                .isInstanceOf(ParameterizedType.class);
        ParameterizedType response = (ParameterizedType) method.getGenericReturnType();
        assertThat(response.getRawType()).isEqualTo(R.class);
        assertThat(response.getActualTypeArguments()[0].getTypeName())
                .doesNotContain("java.lang.Object");
    }
}
