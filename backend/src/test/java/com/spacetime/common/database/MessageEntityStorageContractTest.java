package com.spacetime.common.database;

import com.spacetime.common.entity.AppMessageRecord;
import com.spacetime.common.entity.AppMessageWhisper;
import com.spacetime.common.entity.AppSystemMessage;
import com.spacetime.common.entity.AppAssistantMessage;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("PRD-03 消息实体存储契约")
class MessageEntityStorageContractTest {

    @Test
    @DisplayName("消息主表实体应保存明文、唯一 TIM 映射和正文清理时间")
    void recordShouldOwnContentAndTimMapping() {
        Set<String> fields = fieldsOf(AppMessageRecord.class);

        assertThat(fields).contains("contentText", "contentClearedAt", "timMessageId", "timMsgKey",
                "receiverReadStatus", "receiverReadAt");
        assertThat(fields).doesNotContain("contentCiphertext", "contentIv", "contentKeyVersion",
                "contentHmac", "moderationProvider", "moderationDecisionNo", "moderationStatus");
    }

    @Test
    @DisplayName("悄悄话实体应通过消息外键读取 TIM 映射")
    void whisperShouldReferenceMessagesInsteadOfDuplicatingTimMapping() {
        Set<String> fields = fieldsOf(AppMessageWhisper.class);

        assertThat(fields).contains("requestMessageId", "replyMessageId");
        assertThat(fields).doesNotContain("requestTimMessageId", "requestTimMsgKey",
                "replyTimMessageId", "replyTimMsgKey", "providerMsgKey",
                "contentCiphertext", "replyCiphertext");
    }

    @Test
    @DisplayName("系统消息和官方助手应以明文字段保存标题正文")
    void platformMessagesShouldOwnPlaintextTitleAndContent() {
        assertThat(fieldsOf(AppSystemMessage.class)).contains("titleText", "contentText");
        assertThat(fieldsOf(AppAssistantMessage.class)).contains("titleText", "contentText");
    }

    @Test
    @DisplayName("Inbox 实体应声明临时载荷截止和清理时间")
    void inboxShouldExposeTemporaryPayloadLifecycle() throws ClassNotFoundException {
        Class<?> inboxType = Class.forName("com.spacetime.common.entity.AppMessageEventInbox");
        assertThat(fieldsOf(inboxType))
                .contains("payloadCiphertext", "payloadExpiresAt", "payloadClearedAt");
    }

    private Set<String> fieldsOf(Class<?> type) {
        return Arrays.stream(type.getDeclaredFields())
                .map(Field::getName)
                .collect(Collectors.toSet());
    }
}
