package com.spacetime.miniapp.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("PRD-03 小程序消息对接文档契约")
class MessageMobileHandoffDocumentTest {

    private static final String DOCUMENT =
            "docs/技术方案/2026-07-31-消息、私信与通知中心-mobile-api-handoff.md";

    @Test
    @DisplayName("文档应覆盖当前消息首页和悄悄话全部公开路由")
    void shouldDocumentCurrentMessageAndWhisperRoutes() throws IOException {
        String document = readProjectFile(DOCUMENT);
        List<String> routes = List.of(
                "/miniapp/message/home",
                "/miniapp/message/unread-summary",
                "/miniapp/message/conversations",
                "/miniapp/message/conversations/{conversationNo}",
                "/miniapp/message/conversations/{conversationNo}/read",
                "/miniapp/message/conversations/{conversationNo}/block",
                "/miniapp/message/whispers",
                "/miniapp/message/whispers/{whisperNo}",
                "/miniapp/message/whispers/read-batch",
                "/miniapp/message/whispers/received/hide-all",
                "/miniapp/message/whispers/precheck",
                "/miniapp/message/whispers/{whisperNo}/reply",
                "/miniapp/message/assistant/messages",
                "/miniapp/message/assistant/messages/read-batch",
                "/miniapp/message/system-messages",
                "/miniapp/message/system-messages/read-batch",
                "/miniapp/im/credentials",
                "/miniapp/community/config",
                "/miniapp/file/upload-ticket/report-evidence",
                "/miniapp/community/reports");

        routes.forEach(route -> assertThat(document).contains(route));
        assertThat(document)
                .contains("`direction`", "`bucket`", "`totalCount`", "`actions`")
                .contains("`contentAvailable`", "`sourceScene`", "`sourceBizNo`")
                .contains("`evidenceImageUrls`")
                .contains("`accessMode`", "`safety_readonly`", "`canReportChat`")
                .contains("`reportContext`", "`cardType`", "`contentFormat`", "`actionText`")
                .contains("C2C.CallbackAfterMsgReport", "本地 Outbox", "localOutboxId")
                .contains("`timMessageId`", "`timMsgKey`", "`reportReasons`")
                .contains("`targetType=chat`", "`sourceType=private_chat`", "`sourceType=whisper`");
    }

    @Test
    @DisplayName("文档不得继续声明已删除的悄悄话兼容字段")
    void shouldNotDocumentRemovedWhisperCompatibilityFields() throws IOException {
        String document = readProjectFile(DOCUMENT);

        assertThat(document).doesNotContain(
                "requestTimMessageId", "requestTimMsgKey",
                "replyTimMessageId", "replyTimMsgKey",
                "targetAvatarUrl", "sourcePostNo", "coinCost", "paymentMethod",
                "LiteChat SDK", "report_user、block、block_and_report",
                "targetType=message", "targetType=conversation", "targetType=whisper",
                "\"targetBizNo\"", "clientMsgId");
    }

    private String readProjectFile(String relativePath) throws IOException {
        Path current = Path.of("").toAbsolutePath();
        for (int i = 0; i < 4 && current != null; i++, current = current.getParent()) {
            Path candidate = current.resolve(relativePath);
            if (Files.exists(candidate)) {
                return Files.readString(candidate, StandardCharsets.UTF_8);
            }
        }
        throw new IOException("项目文件不存在: " + relativePath);
    }
}
