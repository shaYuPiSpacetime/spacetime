package com.spacetime.common.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.ContentArticleDao;
import com.spacetime.common.entity.ContentArticle;
import com.spacetime.common.model.message.SystemMessageEvent;
import com.spacetime.common.service.impl.MessageAnnouncementHydrationServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("平台公告懒加载为系统消息")
class MessageAnnouncementHydrationServiceImplTest {
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 8, 10, 12, 0);

    @Mock private ContentArticleDao contentArticleDao;
    @Mock private MessageEventPublisher eventPublisher;
    @Mock private MessageEventInboxService inboxService;

    private MessageAnnouncementHydrationServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new MessageAnnouncementHydrationServiceImpl(
                contentArticleDao, eventPublisher, inboxService);
    }

    @Test
    void shouldPublishAndSynchronouslyConsumeCurrentAnnouncementVersion() {
        ContentArticle article = announcement();
        Page<ContentArticle> page = new Page<>(1, 100, false);
        page.setRecords(List.of(article));
        when(contentArticleDao.selectEnabledPage(any(), eq("ANNOUNCEMENT"), eq(null)))
                .thenReturn(page);
        when(eventPublisher.publishSystemMessage(any(), eq(NOW))).thenReturn(91L);

        service.hydrate(8L, NOW);

        ArgumentCaptor<SystemMessageEvent> captor = ArgumentCaptor.forClass(SystemMessageEvent.class);
        verify(eventPublisher).publishSystemMessage(captor.capture(), eq(NOW));
        SystemMessageEvent event = captor.getValue();
        assertThat(event.sourceModule()).isEqualTo("content");
        assertThat(event.producerEventId()).isEqualTo("article:12:v2.1");
        assertThat(event.receiverUserId()).isEqualTo(8L);
        assertThat(event.bizNo()).isEqualTo("summer-safety");
        assertThat(event.templateCode()).isEqualTo("platform_announcement");
        assertThat(event.bizType()).isEqualTo("platform_announcement");
        assertThat(event.variables())
                .containsEntry("announcementTitle", "暑期安全公告")
                .containsEntry("announcementText", "正文不会覆盖已有摘要");
        assertThat(event.visibleUntil()).isEqualTo(article.getExpireTime());
        verify(inboxService).process(91L, NOW);
    }

    @Test
    void shouldNotBreakMessageListWhenOneAnnouncementCannotBePublished() {
        Page<ContentArticle> page = new Page<>(1, 100, false);
        page.setRecords(List.of(announcement()));
        when(contentArticleDao.selectEnabledPage(any(), eq("ANNOUNCEMENT"), eq(null)))
                .thenReturn(page);
        when(eventPublisher.publishSystemMessage(any(), eq(NOW)))
                .thenThrow(new IllegalStateException("kms unavailable"));

        assertThatCode(() -> service.hydrate(8L, NOW)).doesNotThrowAnyException();
    }

    @Test
    void shouldKeepCompleteAnnouncementTextBeyondTwoThousandCharacters() {
        ContentArticle article = announcement();
        String body = "公告正文" + "内容".repeat(1200);
        article.setContentBody("<p>" + body + "</p>");
        Page<ContentArticle> page = new Page<>(1, 100, false);
        page.setRecords(List.of(article));
        when(contentArticleDao.selectEnabledPage(any(), eq("ANNOUNCEMENT"), eq(null)))
                .thenReturn(page);
        when(eventPublisher.publishSystemMessage(any(), eq(NOW))).thenReturn(92L);

        service.hydrate(8L, NOW);

        ArgumentCaptor<SystemMessageEvent> captor = ArgumentCaptor.forClass(SystemMessageEvent.class);
        verify(eventPublisher).publishSystemMessage(captor.capture(), eq(NOW));
        assertThat(captor.getValue().variables().get("announcementText")).isEqualTo(body);
    }

    private ContentArticle announcement() {
        ContentArticle article = new ContentArticle();
        article.setId(12L);
        article.setContentCode("summer-safety");
        article.setVersion("v2.1");
        article.setTitle("暑期安全公告");
        article.setSummary("请注意保护个人隐私");
        article.setContentBody("<p>正文不会覆盖已有摘要</p>");
        article.setExpireTime(LocalDateTime.of(2026, 9, 1, 0, 0));
        return article;
    }
}
