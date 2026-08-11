package com.spacetime.miniapp.controller;

import com.spacetime.common.result.R;
import com.spacetime.miniapp.dto.response.ImCredentialVO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
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
                        || method.getAnnotation(PostMapping.class) != null)
                .collect(Collectors.toMap(this::routeOf, Method::getName,
                        (left, right) -> left, LinkedHashMap::new));

        assertThat(actual).containsExactlyInAnyOrderEntriesOf(expected);
        Arrays.stream(MiniappMessageController.class.getDeclaredMethods())
                .filter(method -> method.getAnnotation(GetMapping.class) != null
                        || method.getAnnotation(PostMapping.class) != null)
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

    private String routeOf(Method method) {
        GetMapping get = method.getAnnotation(GetMapping.class);
        if (get != null) {
            return "GET " + singlePath(get.value());
        }
        PostMapping post = method.getAnnotation(PostMapping.class);
        return "POST " + singlePath(post.value());
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
